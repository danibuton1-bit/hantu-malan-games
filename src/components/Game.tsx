import { useEffect, useRef, useState } from "react";
import { Battery, Clock, KeyRound, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { batterySvg, characterSvg, CHARACTERS, exclaimSvg, ghostSvg, keySvg, kuntilanakSvg, loadImg, pocongSvg, type CharId } from "@/lib/art";
import { audio } from "@/lib/audio";
import { BATTERIES, CATCH_DIST, decideOutcome, EXIT, GAME_SECONDS, GHOST_SPAWN, HUNTER_SPAWNS, KEYS, move, npcsAt, roomAt, TOTAL_KEYS } from "@/lib/game";
import { CharImg } from "./Art";
import { Joystick } from "./Joystick";
import { createScene } from "@/lib/scene3d";
import { toContent } from "@/lib/orient";
import { EMOTES, emoteIcon } from "@/lib/emotes";
import { MuteButton } from "./MuteButton";
import { Button } from "./ui/button";

export type GamePlayer = { id: string; nama: string; username: string; karakter: CharId; role: "ghost" | "hunter" | null; status: string };
type Live = { yaw: number; x: number; y: number; tx: number; ty: number; status: string; shoutUntil: number; moving: boolean; battery: number };

const HUNTER_SPEED = 150, GHOST_SPEED = 168;

export function Game({ code, me, players, startedAt, isHost, onBackToLobby, onLeave }: {
  code: string; me: string; players: GamePlayer[]; startedAt: number; isHost: boolean; onBackToLobby: () => void; onLeave: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joy = useRef({ x: 0, y: 0 });
  const keysDown = useRef<Record<string, boolean>>({});
  const [hud, setHud] = useState({ time: GAME_SECONDS, keys: 0, battery: 100, statuses: {} as Record<string, string>, near: 0, room: "", cd: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"hunters" | "ghost" | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const shoutRef = useRef<() => void>(() => {});
  const emoteRef = useRef<(e: string) => void>(() => {});
  const [bubbles, setBubbles] = useState<{ k: number; nama: string; e: string }[]>([]);
  const [emoteOpen, setEmoteOpen] = useState(false);

  const meP = players.find((p) => p.id === me)!;
  const amGhost = meP.role === "ghost";

  useEffect(() => { setIsTouch(window.matchMedia("(pointer: coarse)").matches); }, []);

  useEffect(() => {
    audio.init(); audio.startMusic();
    const hunters = players.filter((p) => p.role === "hunter");
    const live: Record<string, Live> = {};
    players.forEach((p) => {
      const s = p.role === "ghost" ? GHOST_SPAWN : HUNTER_SPAWNS[hunters.indexOf(p) % 3]!;
      live[p.id] = { yaw: p.role === "ghost" ? 0 : Math.PI, x: s.x, y: s.y, tx: s.x, ty: s.y, status: "alive", shoutUntil: 0, moving: false, battery: 100 };
    });
    let keyMask = 0, batMask = 0, ended = false, lastSend = 0, lastStep = 0, stunUntil = 0, npcCd = 0;
    const meL = live[me]!;
    const url = (svg: string) => loadImg(svg).src;
    const imgUrls: Record<string, string> = { ghost: url(ghostSvg()), kunti: url(kuntilanakSvg()), pocong: url(pocongSvg()), key: url(keySvg()), bat: url(batterySvg()), ex: url(exclaimSvg()) };
    (Object.keys(CHARACTERS) as CharId[]).forEach((c) => { imgUrls[c] = url(characterSvg(c)); });
    const sc = createScene(canvasRef.current!, { me: amGhost ? "ghost" : meP.karakter, amGhost, imgs: imgUrls });
    players.forEach((p) => { if (p.id !== me) sc.ensurePlayer(p.id, p.role === "ghost" ? "ghost" : p.karakter, p.role !== "ghost"); });
    sc.resize(); const onResize = () => sc.resize(); window.addEventListener("resize", onResize);
    let pitch = 0;
    const cv = canvasRef.current!;
    const look = (dx: number, dy: number) => { meL.yaw -= dx * 0.0042; pitch = Math.max(-1.1, Math.min(1.1, pitch - dy * 0.0042)); };
    const onMouse = (e: MouseEvent) => { if (document.pointerLockElement === cv) look(e.movementX * 0.6, e.movementY * 0.6); };
    const onClick = () => { if (!window.matchMedia("(pointer: coarse)").matches) void cv.requestPointerLock?.(); };
    let touchId: number | null = null, tx0 = 0, ty0 = 0;
    const onPD = (e: PointerEvent) => { if (e.pointerType === "mouse") return; touchId = e.pointerId; tx0 = e.clientX; ty0 = e.clientY; };
    const onPM = (e: PointerEvent) => { if (e.pointerId !== touchId) return; const d = toContent(e.clientX - tx0, e.clientY - ty0); look(d.x * 1.4, d.y * 1.4); tx0 = e.clientX; ty0 = e.clientY; };
    const onPU = (e: PointerEvent) => { if (e.pointerId === touchId) touchId = null; };
    document.addEventListener("mousemove", onMouse); cv.addEventListener("click", onClick);
    cv.addEventListener("pointerdown", onPD); window.addEventListener("pointermove", onPM); window.addEventListener("pointerup", onPU);
    let toastTimer = 0;
    const notify = (m: string) => { setToast(m); clearTimeout(toastTimer); toastTimer = window.setTimeout(() => setToast(null), 2600); };

    const ch = supabase.channel(`game-${code}`, { config: { broadcast: { self: false } } });
    const setStatus = (id: string, s: string) => {
      const l = live[id]; if (!l || l.status === s || l.status !== "alive") return;
      l.status = s;
      if (s === "caught") { audio.scream(); if (id === me) notify("KAMU TERTANGKAP! Sekarang kamu jadi penonton."); else notify(`${players.find((p) => p.id === id)?.nama} tertangkap!`); }
      if (s === "escaped") notify(`${players.find((p) => p.id === id)?.nama} berhasil kabur!`);
      if (id === me) void supabase.from("players").update({ status: s }).eq("room_code", code).eq("profile_id", me);
    };
    const gainKeys = (mask: number, local: boolean) => {
      const fresh = mask & ~keyMask;
      if (!fresh) return;
      keyMask |= mask;
      KEYS.forEach((k) => { if (fresh & (1 << k.id)) { audio.pickup(); notify(local ? `Kamu dapat ${k.name}!` : `Tim dapat ${k.name}!`); } });
      if (keyMask === 31) { audio.creak(); setTimeout(() => notify("Semua kunci terkumpul! Kabur lewat gerbang Kuburan Belakang!"), 1200); }
    };
    ch.on("broadcast", { event: "pos" }, ({ payload }) => {
      const p = payload as { id: string; a?: number; x: number; y: number; m: boolean; st: string; k: number; b: number };
      const l = live[p.id]; if (!l) return;
      l.tx = p.x; l.ty = p.y; l.moving = p.m; if (p.a !== undefined) l.yaw = p.a;
      if (p.st !== "alive") setStatus(p.id, p.st);
      gainKeys(p.k, false); batMask |= p.b;
    });
    ch.on("broadcast", { event: "caught" }, ({ payload }) => setStatus((payload as { id: string }).id, "caught"));
    ch.on("broadcast", { event: "shout" }, ({ payload }) => { const l = live[(payload as { id: string }).id]; if (l) { l.shoutUntil = performance.now() + 2500; audio.shout(); } });
    const showEmote = (id: string, e: string) => {
      const k = Math.random(); const nama = id === me ? "Kamu" : players.find((p) => p.id === id)?.nama ?? "?";
      setBubbles((b) => [...b.slice(-3), { k, nama, e }]);
      setTimeout(() => setBubbles((b) => b.filter((x) => x.k !== k)), 2600);
    };
    ch.on("broadcast", { event: "emote" }, ({ payload }) => { const p = payload as { id: string; e: string }; showEmote(p.id, p.e); });
    ch.subscribe();
    const send = (event: string, payload: object) => void ch.send({ type: "broadcast", event, payload });

    let emoteCd = 0;
    emoteRef.current = (e: string) => { const n = performance.now(); if (n < emoteCd) return; emoteCd = n + 1200; showEmote(me, e); void ch.send({ type: "broadcast", event: "emote", payload: { id: me, e } }); };
    shoutRef.current = () => {
      if (meL.status !== "alive" || performance.now() < meL.shoutUntil) return;
      meL.shoutUntil = performance.now() + 2500; audio.shout(); send("shout", { id: me });
    };
    const kd = (e: KeyboardEvent) => { keysDown.current[e.key.toLowerCase()] = true; if (e.key === " " ) shoutRef.current(); if (e.key.startsWith("Arrow")) e.preventDefault(); };
    const ku = (e: KeyboardEvent) => { keysDown.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);

    let raf = 0, last = performance.now(), hudT = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const elapsed = Math.max(0, (Date.now() - startedAt) / 1000);
      const countdown = Date.now() < startedAt;
      const timeLeft = Math.max(0, GAME_SECONDS - elapsed);
      const t = elapsed;

      // input
      const k = keysDown.current;
      let ix = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0) + joy.current.x;
      let iy = (k["s"] || k["arrowdown"] ? 1 : 0) - (k["w"] || k["arrowup"] ? 1 : 0) + joy.current.y;
      const mag = Math.hypot(ix, iy); if (mag > 1) { ix /= mag; iy /= mag; }
      const canMove = !countdown && !ended && meL.status === "alive" && now > stunUntil;
      meL.moving = canMove && mag > 0.1;
      if (meL.moving) {
        const sp = (amGhost ? GHOST_SPEED : HUNTER_SPEED) * dt;
        const fw = -iy, sy = Math.sin(meL.yaw), cy = Math.cos(meL.yaw);
        const p = move(meL.x, meL.y, (fw * -sy + ix * cy) * sp, (fw * -cy - ix * sy) * sp);
        meL.x = p.x; meL.y = p.y;
        if (now - lastStep > (amGhost ? 520 : 330)) { lastStep = now; if (!amGhost) audio.step(); }
      }
      meL.tx = meL.x; meL.ty = meL.y;
      for (const [id, l] of Object.entries(live)) if (id !== me) { l.x += (l.tx - l.x) * Math.min(1, dt * 12); l.y += (l.ty - l.y) * Math.min(1, dt * 12); }

      const npcs = npcsAt(t);
      if (!amGhost && meL.status === "alive" && !countdown && !ended) {
        meL.battery = Math.max(0, meL.battery - dt * 1.1);
        KEYS.forEach((key) => { if (!(keyMask & (1 << key.id)) && Math.hypot(key.x - meL.x, key.y - meL.y) < 34) gainKeys(1 << key.id, true); });
        BATTERIES.forEach((b) => { if (!(batMask & (1 << b.id)) && Math.hypot(b.x - meL.x, b.y - meL.y) < 34) { batMask |= 1 << b.id; meL.battery = Math.min(100, meL.battery + 60); audio.pickup(); notify("Baterai senter terisi!"); } });
        if (now > npcCd) for (const n of npcs) if (Math.hypot(n.x - meL.x, n.y - meL.y) < 40) {
          npcCd = now + 3000; stunUntil = now + 900; meL.battery = Math.max(0, meL.battery - 25); audio.scream();
          notify(n.kind === "pocong" ? "Pocong melompat ke arahmu! Senter melemah." : "Kuntilanak menjerit! Senter melemah.");
          break;
        }
        if (keyMask === 31 && Math.hypot(EXIT.x - meL.x, EXIT.y - meL.y) < EXIT.r) setStatus(me, "escaped");
      }
      if (amGhost && !countdown && !ended) {
        for (const [id, l] of Object.entries(live)) if (id !== me && l.status === "alive" && Math.hypot(l.x - meL.x, l.y - meL.y) < CATCH_DIST) { setStatus(id, "caught"); send("caught", { id }); }
      }
      if (now - lastSend > 100) { lastSend = now; send("pos", { id: me, x: Math.round(meL.x), y: Math.round(meL.y), a: Math.round(meL.yaw * 100) / 100, m: meL.moving, st: meL.status, k: keyMask, b: batMask }); }

      // proximity fear
      const ghostId = players.find((p) => p.role === "ghost")?.id;
      const gl = ghostId ? live[ghostId] : undefined;
      const near = !amGhost && gl && meL.status === "alive" ? Math.max(0, 1 - Math.hypot(gl.x - meL.x, gl.y - meL.y) / 360) : 0;
      audio.heartbeat(near); audio.setBreath(amGhost ? 0.25 : near);

      // outcome
      if (!ended && !countdown) {
        const res = decideOutcome(players.filter((p) => p.role === "hunter").map((p) => ({ status: live[p.id]!.status })), timeLeft);
        if (res) {
          ended = true; setOutcome(res); audio.stopAll();
          if (isHost) {
            void supabase.from("game_state").update({ winner: res, keys_found: [0, 1, 2, 3, 4].filter((i) => keyMask & (1 << i)).length, updated_at: new Date().toISOString() }).eq("room_code", code);
            void supabase.from("rooms").update({ status: "ended" }).eq("code", code);
          }
        }
      }

      // camera follows me, or an alive hunter when spectating
      let cam = meL;
      if (meL.status !== "alive") { const alive = Object.entries(live).find(([id, l]) => l.status === "alive" && players.find((p) => p.id === id)?.role === "hunter"); if (alive) cam = alive[1]; }
      const fp = cam === meL;
      sc.frame({ dt, t, cam, yaw: fp ? meL.yaw : cam.yaw, pitch: fp ? pitch : 0, moving: meL.moving, battery: meL.battery, near, keyMask, batMask, npcs, firstPerson: fp && meL.status === "alive",
        others: players.filter((p) => p.id !== me).map((p) => { const l = live[p.id]!; return { id: p.id, x: l.x, y: l.y, yaw: l.yaw, ghost: p.role === "ghost", shouting: now < l.shoutUntil, visible: l.status === "alive" && l !== cam }; }) });
      if (now - hudT > 200) {
        hudT = now;
        setHud({ time: Math.ceil(timeLeft), keys: [0, 1, 2, 3, 4].filter((i) => keyMask & (1 << i)).length, battery: meL.battery, near, room: roomAt(meL.x, meL.y), cd: countdown ? Math.ceil((startedAt - Date.now()) / 1000) : 0, statuses: Object.fromEntries(Object.entries(live).map(([id, l]) => [id, l.status])) });
      }
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf); clearTimeout(toastTimer); sc.dispose();
      window.removeEventListener("resize", onResize); document.removeEventListener("mousemove", onMouse); cv.removeEventListener("click", onClick);
      cv.removeEventListener("pointerdown", onPD); window.removeEventListener("pointermove", onPM); window.removeEventListener("pointerup", onPU);
      if (document.pointerLockElement) void document.exitPointerLock();
      window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku);
      void supabase.removeChannel(ch); audio.stopAll();
    };
  }, [code, me, players.map((p) => p.id + p.role).join(), startedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const spectating = hud.statuses[me] === "caught";
  const mm = Math.floor(hud.time / 60), ss = String(hud.time % 60).padStart(2, "0");
  const won = outcome === "hunters" ? !amGhost : amGhost;

  return (
    <div className="fixed inset-0 select-none overflow-hidden bg-void">
      <canvas ref={canvasRef} className="h-full w-full touch-none" style={{ filter: spectating ? "grayscale(1) contrast(1.1)" : undefined }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${0.75 + hud.near * 0.2}) 100%)`, boxShadow: hud.near > 0.3 ? `inset 0 0 ${80 * hud.near}px rgba(170,0,20,.6)` : undefined }} />
      {/* HUD */}
      <div className="absolute inset-x-0 top-0 flex items-start gap-2 p-2">
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-card/80 px-3 py-1.5 text-sm">
          <span className={`flex items-center gap-1 ${hud.time < 60 ? "text-primary animate-pulse" : ""}`}><Clock className="size-4" />{mm}:{ss}</span>
          <span className="flex items-center gap-1 text-gold"><KeyRound className="size-4" />{hud.keys}/{TOTAL_KEYS}</span>
          {!amGhost && <span className="flex items-center gap-1"><Battery className="size-4" />{Math.round(hud.battery)}%</span>}
        </div>
        <div className="flex flex-1 flex-wrap justify-center gap-1">
          {players.filter((p) => p.role === "hunter").map((p) => {
            const st = hud.statuses[p.id] ?? "alive";
            return (
              <div key={p.id} className={`flex items-center gap-1 rounded bg-card/80 px-1.5 py-0.5 text-xs ${st === "caught" ? "opacity-40 grayscale" : ""}`}>
                <CharImg id={p.karakter} className="h-6 w-5" />
                <span className="max-w-16 truncate">{p.nama}</span>
                <span className={st === "alive" ? "text-chart-4" : st === "escaped" ? "text-gold" : "text-primary"}>{st === "alive" ? "hidup" : st === "escaped" ? "kabur" : "tertangkap"}</span>
              </div>
            );
          })}
        </div>
        <MuteButton className="pointer-events-auto" />
      </div>
      <div className="absolute left-1/2 top-12 -translate-x-1/2 text-xs text-muted-foreground">{amGhost ? "HANTU ASAP" : "PEMBURU"} - {hud.room}</div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/50" />
      {hud.near > 0.2 && <div className="pointer-events-none absolute inset-0 animate-pulse" style={{ background: `repeating-linear-gradient(0deg, rgba(255,255,255,${hud.near * 0.05}) 0 1px, transparent 1px 3px)`, mixBlendMode: "screen" }} />}
      {hud.cd > 0 && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-void/50 text-center"><div className="font-horror text-8xl text-primary">{hud.cd}</div><p className="mt-3 px-6 text-foreground">{amGhost ? "KAMU HANTU ASAP. Tangkap semua pemburu!" : "KAMU PEMBURU. Cari 5 kunci dan kabur!"}</p></div>}
      {toast && <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-lg border border-gold bg-card/90 px-4 py-2 text-center text-sm font-bold text-gold">{toast}</div>}
      {spectating && !outcome && <div className="absolute inset-x-0 top-28 text-center font-horror text-2xl text-foreground">KAMU JADI PENONTON</div>}
      <div className="pointer-events-none absolute right-24 top-24 flex flex-col items-end gap-1">
        {bubbles.map((b) => <div key={b.k} className="animate-in fade-in slide-in-from-right rounded-full bg-card/85 px-3 py-1 text-sm"><b>{b.nama}</b> <span className="text-2xl">{emoteIcon(b.e)}</span></div>)}
      </div>
      <div className="absolute bottom-32 right-6 flex flex-col items-end gap-2">
        {emoteOpen && <div className="grid grid-cols-3 gap-1 rounded-xl bg-card/85 p-1.5">
          {EMOTES.map((e) => <button key={e.id} onPointerDown={() => { emoteRef.current(e.id); setEmoteOpen(false); }} className="size-11 rounded-lg bg-muted text-2xl">{e.icon}</button>)}
        </div>}
        <button onPointerDown={() => setEmoteOpen((o) => !o)} className="flex size-12 items-center justify-center rounded-full border border-border bg-card/80 text-2xl" aria-label="Emote">😀</button>
      </div>
      {/* controls */}
      {isTouch && <div className="absolute bottom-6 left-6"><Joystick vec={joy} /></div>}
      {isTouch && <div className="pointer-events-none absolute bottom-2 right-32 text-xs text-muted-foreground">Geser layar untuk melihat</div>}
      {!amGhost && !spectating && (
        <button onPointerDown={() => shoutRef.current()} className="absolute bottom-8 right-6 flex size-20 flex-col items-center justify-center rounded-full border-2 border-primary bg-blood/80 text-xs font-bold text-primary-foreground glow-blood">
          <Megaphone className="size-6" />TOLONG!
        </button>
      )}
      {!isTouch && <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">Klik layar lalu gerakkan mouse untuk melihat. WASD / Panah untuk jalan{!amGhost && ", Spasi untuk teriak"}</div>}
      {outcome && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-void/90 p-6 text-center">
          <h1 className={`font-horror text-drip text-5xl ${won ? "text-gold" : "text-primary"}`}>
            {outcome === "hunters" ? (amGhost ? "PEMBURU KABUR..." : "KAMU BERHASIL KABUR!") : "HANTU MENANG..."}
          </h1>
          <p className="text-muted-foreground">{won ? "Kamu menang malam ini." : "Malam ini milik kegelapan."}</p>
          <div className="flex gap-3">
            {isHost && <Button size="lg" onClick={onBackToLobby}>Main Lagi</Button>}
            <Button size="lg" variant="secondary" onClick={onLeave}>Keluar</Button>
          </div>
          {!isHost && <p className="text-xs text-muted-foreground">Menunggu host untuk main lagi...</p>}
        </div>
      )}
    </div>
  );
}
