import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Crown } from "lucide-react";
import { CharImg } from "@/components/Art";
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
  const [wait, setWait] = useState(15);
  const [err, setErr] = useState("");

  useEffect(() => { if (ready && !account) void nav({ to: "/" }); }, [ready, account, nav]);

  const refresh = useCallback(async () => {
    const [{ data: r }, { data: ps }, { data: gs }] = await Promise.all([
      supabase.from("rooms").select("code,host_id,status").eq("code", code).maybeSingle(),
      supabase.from("players").select("*").eq("room_code", code).order("joined_at"),
      supabase.from("game_state").select("started_at").eq("room_code", code).maybeSingle(),
    ]);
    setRoomRow(r ?? null);
    setPlayers((ps ?? []).map((p) => ({ id: p.profile_id, nama: p.nama, username: p.username, karakter: p.karakter as GamePlayer["karakter"], role: (p.role as GamePlayer["role"]) ?? null, status: p.status })));
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
    if (players.length < 2) return;
    audio.init();
    const ghost = players[Math.floor(Math.random() * players.length)]!;
    await Promise.all(players.map((p) => supabase.from("players").update({ role: p.id === ghost.id ? "ghost" : "hunter", status: "alive" }).eq("room_code", code).eq("profile_id", p.id)));
    await supabase.from("game_state").upsert({ room_code: code, keys_found: 0, started_at: new Date(Date.now() + 3000).toISOString(), winner: null, updated_at: new Date().toISOString() });
    await supabase.from("rooms").update({ status: "playing" }).eq("code", code);
  }

  async function backToLobby() {
    await supabase.from("players").update({ role: null, status: "alive" }).eq("room_code", code);
    await supabase.from("rooms").update({ status: "lobby" }).eq("code", code);
  }

  const hostId = players[0]?.id;
  const lobby = room?.status === "lobby";
  useEffect(() => {
    if (!lobby || players.length < 2) { setWait(15); return; }
    if (players.length >= 4 && hostId === account?.id) { void start(); return; }
    const t = setInterval(() => setWait((w) => { if (w <= 1) { if (hostId === account?.id) void start(); return 15; } return w - 1; }), 1000);
    return () => clearInterval(t);
  }, [lobby, players.length, hostId, account?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <main className="relative flex h-full min-h-full flex-col items-center justify-center gap-4 p-4">
      <header className="absolute inset-x-0 top-0 flex items-start gap-2 p-2"><div className="w-64"><ProfileCorner /></div><div className="flex-1" /><MuteButton /></header>
      <button onClick={leave} className="absolute bottom-3 left-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Batal</button>
      <h1 className="font-horror text-4xl text-primary animate-pulse">MENCARI PEMAIN...</h1>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex gap-3">
        {[0, 1, 2, 3].map((i) => { const p = players[i]; return (
          <div key={i} className="flex h-36 w-24 flex-col items-center justify-end rounded-lg border border-border bg-card p-1">
            {p ? <><CharImg id={p.karakter} className="h-24" /><div className="flex w-full items-center justify-center gap-1 truncate text-xs font-bold">{i === 0 && <Crown className="size-3 text-gold" />}{p.nama}</div></> : <div className="mb-10 text-2xl text-muted-foreground">?</div>}
          </div>
        ); })}
      </div>
      <p className="text-sm text-muted-foreground">{players.length}/4 pemain · {players.length < 2 ? "menunggu minimal 2 pemain" : `mulai otomatis dalam ${wait} detik`}</p>
      {isHost && players.length >= 2 && <Button className="glow-blood" onClick={start}>MULAI SEKARANG</Button>}
    </main>
  );
}
