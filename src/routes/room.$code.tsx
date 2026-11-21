import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, Crown, Ghost } from "lucide-react";
import { CharImg, EmoteIcon } from "@/components/Art";
import { SocialPanel } from "@/components/Social";
import { EMOTES, EMOTE_MS, PAIR_EMOTES } from "@/lib/emotes";
import { assignRoles } from "@/lib/game";
import { normalizeChar } from "@/lib/art";

const SLOT = 108;
import { useApp } from "@/components/AppState";
import { Game, type GamePlayer } from "@/components/Game";
import { MuteButton } from "@/components/MuteButton";
import { ProfileCorner } from "@/components/ProfileCorner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { audio } from "@/lib/audio";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Mencari Pemain ${params.code} - Hantu Malam` },
      { name: "description", content: `Mencari pemain untuk pertandingan horor Hantu Malam.` },
      { property: "og:title", content: `Pertandingan ${params.code} - Hantu Malam` },
      { property: "og:description", content: "Lobby mabar horor: 1 hantu melawan 3 pemburu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPage,
});

type RoomRow = { code: string; host_id: string; status: string };

function RoomPage() {
  const { code } = Route.useParams();
  const { ready, account, setRoom } = useApp();
  const nav = useNavigate();
  const [room, setRoomRow] = useState<RoomRow | null | undefined>(undefined);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [startedAt, setStartedAt] = useState<number>(0);
    const [err, setErr] = useState("");

  useEffect(() => { if (ready && !account) void nav({ to: "/" }); }, [ready, account, nav]);

  const refresh = useCallback(async () => {
    const [{ data: r }, { data: ps }, { data: gs }] = await Promise.all([
      supabase.from("rooms").select("code,host_id,status").eq("code", code).maybeSingle(),
      supabase.from("players").select("*").eq("room_code", code).order("joined_at"),
      supabase.from("game_state").select("started_at").eq("room_code", code).maybeSingle(),
    ]);
    setRoomRow(r ?? null);
    setPlayers((ps ?? []).map((p) => ({ id: p.profile_id, nama: p.nama, username: p.username, karakter: normalizeChar(p.karakter) ?? "raka", pref: p.role_pref, role: (p.role as GamePlayer["role"]) ?? null, status: p.status })));
    if (gs?.started_at) setStartedAt(new Date(gs.started_at).getTime());
  }, [code]);

  // join
  useEffect(() => {
    if (!account) return;
    setRoom(code);
    void (async () => {
      const { data: r } = await supabase.from("rooms").select("status").eq("code", code).maybeSingle();
      if (!r) { setRoomRow(null); return; }
      const { count } = await supabase.from("players").select("id", { count: "exact", head: true }).eq("room_code", code);
      const { data: mine } = await supabase.from("players").select("id").eq("room_code", code).eq("profile_id", account.id).maybeSingle();
      if (!mine) {
        if ((count ?? 0) >= 4) { setErr("Pertandingan penuh, kembali ke lobby dan tekan MULAI lagi."); }
        else if (r.status !== "lobby") { setErr("Pertandingan sudah berjalan, kembali ke lobby dan tekan MULAI lagi."); }
        else await supabase.from("players").insert({ room_code: code, profile_id: account.id, nama: account.nama, username: account.username, karakter: account.karakter_pilihan });
      }
      await refresh();
    })();
    const ch = supabase.channel(`room-db-${code}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` }, () => void refresh())
      .subscribe();
    return () => { void supabase.removeChannel(ch); setRoom(null); };
  }, [account, code, refresh, setRoom]);

  async function leave() {
    if (!account) return;
    await supabase.from("players").delete().eq("room_code", code).eq("profile_id", account.id);
    void nav({ to: "/home" });
  }

  async function start() {
    if (players.length < 1) return;
    audio.init();
    const { roles } = assignRoles(players.map((p) => ({ id: p.id, pref: p.pref ?? "hunter" })));
    await Promise.all(players.map((p) => supabase.from("players").update({ role: roles[p.id]!, status: "alive" }).eq("room_code", code).eq("profile_id", p.id)));
    await supabase.from("game_state").upsert({ room_code: code, keys_found: 0, started_at: new Date(Date.now() + 3000).toISOString(), winner: null, updated_at: new Date().toISOString() });
    await supabase.from("rooms").update({ status: "playing" }).eq("code", code);
  }

  async function setPref(pref: "ghost" | "hunter") {
    if (!account) return;
    setPlayers((ps) => ps.map((p) => (p.id === account.id ? { ...p, pref } : p)));
    await supabase.from("players").update({ role_pref: pref }).eq("room_code", code).eq("profile_id", account.id);
  }

  async function backToLobby() {
    await supabase.from("players").update({ role: null, status: "alive" }).eq("room_code", code);
    await supabase.from("rooms").update({ status: "lobby" }).eq("code", code);
  }

  const hostId = players[0]?.id;
  const lobby = room?.status === "lobby";
  useEffect(() => {
    if (lobby && players.length >= 4 && hostId === account?.id) void start();
  }, [lobby, players.length, hostId, account?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // lobby emotes, shared with everyone in this room
  const [emotes, setEmotes] = useState<Record<string, { e: string; dx: number; k: number }>>({});
  const lobbyCh = useRef<RealtimeChannel | null>(null);
  const playEmote = useCallback((id: string, e: string, target: string | null) => {
    const ids = players.map((p) => p.id);
    const ai = ids.indexOf(id), ti = target ? ids.indexOf(target) : -1;
    const k = Math.random();
    const next: Record<string, { e: string; dx: number; k: number }> = { [id]: { e, dx: ti >= 0 ? (ti - ai) * SLOT - Math.sign(ti - ai) * 46 : 0, k } };
    if (ti >= 0 && target) next[target] = { e, dx: 0, k };
    setEmotes((m) => ({ ...m, ...next }));
    setTimeout(() => setEmotes((m) => Object.fromEntries(Object.entries(m).filter(([, v]) => v.k !== k))), EMOTE_MS);
  }, [players]);
  const playRef = useRef(playEmote); playRef.current = playEmote;
  useEffect(() => {
    const ch = supabase.channel(`room-lobby-${code}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "emote" }, ({ payload }) => { const p = payload as { id: string; e: string; t: string | null }; playRef.current(p.id, p.e, p.t); }).subscribe();
    lobbyCh.current = ch;
    return () => { lobbyCh.current = null; void supabase.removeChannel(ch); };
  }, [code]);
  function doEmote(e: string) {
    if (!account) return;
    const ids = players.map((p) => p.id); const me = ids.indexOf(account.id);
    let t: string | null = null;
    if (PAIR_EMOTES.includes(e) && ids.length > 1) t = ids.filter((x) => x !== account.id).sort((x, y) => Math.abs(ids.indexOf(x) - me) - Math.abs(ids.indexOf(y) - me))[0] ?? null;
    playEmote(account.id, e, t);
    void lobbyCh.current?.send({ type: "broadcast", event: "emote", payload: { id: account.id, e, t } });
  }

  if (!account || room === undefined) return <main className="p-6 text-center text-muted-foreground">Memuat room...</main>;
  if (room === null) return (
    <main className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h1 className="font-horror text-3xl text-primary">PERTANDINGAN TIDAK ADA</h1>
      <Button asChild><Link to="/home">Kembali</Link></Button>
    </main>
  );

  const isHost = players[0]?.id === account.id;
  const inRoom = players.some((p) => p.id === account.id);
  if (room.status !== "lobby" && inRoom && players.every((p) => p.role)) {
    return <Game code={code} me={account.id} players={players} startedAt={startedAt} isHost={isHost} onBackToLobby={backToLobby} onLeave={leave} />;
  }

  const myPref = players.find((p) => p.id === account.id)?.pref ?? "hunter";
  const ghostWanted = players.filter((p) => p.pref === "ghost").length;
  return (
    <main className="relative flex h-full min-h-full flex-col items-center justify-center gap-3 p-4">
      <header className="absolute inset-x-0 top-0 z-30 flex items-start gap-2 p-2"><div className="w-56"><ProfileCorner /></div><div className="flex-1" /><SocialPanel room={code} /><MuteButton /></header>
      <button onClick={leave} className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Keluar</button>
      <h1 className="font-horror text-3xl text-primary">LOBBY {code}</h1>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => { const p = players[i]; const em = p ? emotes[p.id] : undefined; return (
          <div key={i} className="flex h-40 w-24 flex-col items-center justify-end rounded-lg border border-border bg-card p-1">
            {p ? <>
              <CharImg id={p.karakter} emote={em?.e ?? null} className="relative z-10 h-28 transition-transform duration-500" style={{ transform: `translateX(${em?.dx ?? 0}px)` }} />
              <div className="flex w-full items-center justify-center gap-1 truncate text-xs font-bold">{i === 0 && <Crown className="size-3 text-gold" />}{p.nama}</div>
              <div className={`text-[10px] font-bold ${p.pref === "ghost" ? "text-primary" : "text-chart-4"}`}>{p.pref === "ghost" ? "INGIN JADI HANTU" : "PEMBURU"}</div>
            </> : <div className="mb-12 text-2xl text-muted-foreground">?</div>}
          </div>
        ); })}
      </div>
      {inRoom && <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 p-1.5 text-xs">
        <span className="text-muted-foreground">Pilih peran:</span>
        <Button size="sm" variant={myPref === "hunter" ? "default" : "secondary"} onClick={() => void setPref("hunter")}>Pemburu</Button>
        <Button size="sm" variant={myPref === "ghost" ? "default" : "secondary"} onClick={() => void setPref("ghost")}><Ghost /> Hantu</Button>
      </div>}
      {inRoom && <div className="flex flex-wrap justify-center gap-1">{EMOTES.map((e) => (
        <button key={e.id} onClick={() => doEmote(e.id)} className="flex h-11 w-12 flex-col items-center justify-center rounded-lg bg-muted text-foreground hover:bg-primary/30" title={e.label}><EmoteIcon id={e.id} className="size-4" /><span className="text-[8px]">{e.label}</span></button>
      ))}</div>}
      <p className="text-center text-xs text-muted-foreground">{players.length}/4 pemain · {ghostWanted === 0 || players.length < 2 ? "Tidak ada yang jadi hantu: Hantu AI akan berburu kalian." : "Satu hantu dipilih acak dari yang ingin jadi hantu."}</p>
      {isHost ? <Button className="glow-blood font-horror text-xl" size="lg" onClick={start}>MULAI PERMAINAN</Button> : <p className="text-sm text-muted-foreground">Menunggu host memulai permainan...</p>}
    </main>
  );
}
