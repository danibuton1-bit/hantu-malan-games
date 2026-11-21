import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play, Users } from "lucide-react";
import { Logo, CharImg } from "@/components/Art";
import { useApp } from "@/components/AppState";
import { MuteButton } from "@/components/MuteButton";
import { ProfileCorner } from "@/components/ProfileCorner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CHARACTERS } from "@/lib/art";
import { EMOTES } from "@/lib/emotes";
import { roomCode } from "@/lib/game";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Lobby - Hantu Malam" },
      { name: "description", content: "Lobby Hantu Malam: pilih emote, lihat karakter, lalu tekan MULAI untuk langsung mencari pemain." },
      { property: "og:title", content: "Lobby - Hantu Malam" },
      { property: "og:description", content: "Tekan MULAI dan langsung masuk pertandingan horor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Lobby,
});

/** Find an open match (lobby, <4 players) or create a new one. */
async function findMatch(profileId: string): Promise<string | null> {
  const { data: open } = await supabase.from("rooms").select("code").eq("status", "lobby").order("created_at", { ascending: false }).limit(10);
  for (const r of open ?? []) {
    const { count } = await supabase.from("players").select("id", { count: "exact", head: true }).eq("room_code", r.code);
    if ((count ?? 0) > 0 && (count ?? 0) < 4) return r.code;
  }
  for (let i = 0; i < 5; i++) {
    const c = roomCode();
    const { error } = await supabase.from("rooms").insert({ code: c, host_id: profileId });
    if (!error) return c;
  }
  return null;
}

function Lobby() {
  const { ready, account, online, setRoom } = useApp();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [emote, setEmote] = useState<string | null>(null);
  useEffect(() => { if (ready && !account) void nav({ to: "/" }); }, [ready, account, nav]);
  useEffect(() => setRoom(null), [setRoom]);
  useEffect(() => { if (!emote) return; const t = setTimeout(() => setEmote(null), 1800); return () => clearTimeout(t); }, [emote]);
  if (!account) return null;
  const ch = CHARACTERS[account.karakter_pilihan];

  async function start() {
    if (!account) return;
    setBusy(true); setErr("");
    const c = await findMatch(account.id);
    if (c) { void nav({ to: "/room/$code", params: { code: c } }); return; }
    setErr("Gagal mencari pertandingan, coba lagi."); setBusy(false);
  }

  return (
    <main className="relative h-full min-h-full overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 70%, hsl(350 70% 18% / .7), transparent 60%), var(--background)" }}>
      <header className="absolute inset-x-0 top-0 z-10 flex items-start gap-2 p-2">
        <div className="w-64"><ProfileCorner /></div>
        <Logo className="mx-auto hidden w-28 rounded-md sm:block" />
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-2 text-xs"><Users className="size-4 text-primary" />{online.length} online</div>
        <MuteButton />
      </header>

      {/* character stage */}
      <div className="absolute inset-0 flex items-end justify-center pb-6">
        <div className="relative flex flex-col items-center">
          {emote && <div className="absolute -top-14 animate-bounce text-5xl">{EMOTES.find((e) => e.id === emote)?.icon}</div>}
          <CharImg id={account.karakter_pilihan} className={`h-[55vmin] max-h-80 drop-shadow-[0_0_25px_hsl(350_80%_40%/.6)] ${emote ? "animate-pulse" : ""}`} />
          <div className="mt-1 h-3 w-40 rounded-full bg-primary/30 blur-md" />
          <div className="font-horror text-2xl text-primary">{ch.nama}</div>
        </div>
      </div>

      {/* emote wheel */}
      <aside className="absolute left-2 top-1/2 z-10 grid -translate-y-1/2 grid-cols-2 gap-1.5 rounded-xl border border-border bg-card/70 p-2">
        <div className="col-span-2 text-center text-[10px] font-bold text-muted-foreground">EMOTE</div>
        {EMOTES.map((e) => (
          <button key={e.id} onClick={() => setEmote(e.id)} className="flex size-11 flex-col items-center justify-center rounded-lg bg-muted text-xl hover:bg-primary/30" title={e.label}>
            {e.icon}<span className="text-[8px] text-muted-foreground">{e.label}</span>
          </button>
        ))}
      </aside>

      {/* mode + start */}
      <div className="absolute bottom-3 right-3 z-10 flex w-56 flex-col gap-2">
        <div className="rounded-lg border border-border bg-card/80 p-2 text-xs">
          <div className="font-bold text-primary">MODE: RUMAH TUA</div>
          <div className="text-muted-foreground">1 Hantu vs 3 Pemburu · 5 menit</div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button size="lg" className="h-16 text-2xl font-horror glow-blood" onClick={start} disabled={busy}>
          <Play className="size-6" /> {busy ? "MENCARI..." : "MULAI"}
        </Button>
      </div>
    </main>
  );
}
