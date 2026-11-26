// Shared deterministic game world: every client computes the same map, items and NPC paths.
export const WORLD = { w: 1500, h: 1000 };
export const GAME_SECONDS = 300;
export const TOTAL_KEYS = 5;
export const PLAYER_R = 18;
export const CATCH_DIST = 42;

export type Rect = { x: number; y: number; w: number; h: number };
export type Room = Rect & { name: string; floor: string; outdoor?: boolean; glb?: boolean };

const RW = 500, RH = 500;
const ROOMS_RUMAH: Room[] = [
  { name: "Ruang Tamu", x: 0, y: 0, w: RW, h: RH, floor: "#2a1a14" },
  { name: "Lorong", x: RW, y: 0, w: RW, h: RH, floor: "#1c1620" },
  { name: "Dapur", x: RW * 2, y: 0, w: RW, h: RH, floor: "#22201a" },
  { name: "Kamar Mandi", x: 0, y: RH, w: RW, h: RH, floor: "#18222a" },
  { name: "Gudang", x: RW, y: RH, w: RW, h: RH, floor: "#1f1a12" },
  { name: "Kuburan Belakang", x: RW * 2, y: RH, w: RW, h: RH, floor: "#141d12", outdoor: true },
];

const T = 20; // wall thickness
const DOOR = 110;
function hWall(x: number, y: number, len: number, doorAt?: number): Rect[] {
  if (doorAt === undefined) return [{ x, y: y - T / 2, w: len, h: T }];
  return [
    { x, y: y - T / 2, w: doorAt - DOOR / 2 - x, h: T },
    { x: doorAt + DOOR / 2, y: y - T / 2, w: x + len - (doorAt + DOOR / 2), h: T },
  ];
}
function vWall(x: number, y: number, len: number, doorAt?: number): Rect[] {
  if (doorAt === undefined) return [{ x: x - T / 2, y, w: T, h: len }];
  return [
    { x: x - T / 2, y, w: T, h: doorAt - DOOR / 2 - y },
    { x: x - T / 2, y: doorAt + DOOR / 2, w: T, h: y + len - (doorAt + DOOR / 2) },
  ];
}

/** Swinging doors in every doorway: hinge at one side, v=true when the door sits in a vertical wall. */
const DOORS_RUMAH: { x: number; y: number; v: boolean }[] = [
  { x: RW, y: 250, v: true }, { x: RW * 2, y: 320, v: true }, { x: RW, y: 700, v: true }, { x: RW * 2, y: 780, v: true },
  { x: 250, y: RH, v: false }, { x: 750, y: RH, v: false }, { x: 1250, y: RH, v: false },
];
export const DOOR_W = DOOR;

const WALLS_RUMAH: Rect[] = [
  ...hWall(0, T / 2, WORLD.w), ...hWall(0, WORLD.h - T / 2, WORLD.w),
  ...vWall(T / 2, 0, WORLD.h), ...vWall(WORLD.w - T / 2, 0, WORLD.h),
  ...vWall(RW, 0, RH, 250), ...vWall(RW * 2, 0, RH, 320),
  ...vWall(RW, RH, RH, 700), ...vWall(RW * 2, RH, RH, 780),
  ...hWall(0, RH, RW, 250), ...hWall(RW, RH, RW, 750), ...hWall(RW * 2, RH, RW, 1250),
  // furniture
  { x: 120, y: 120, w: 160, h: 60 }, { x: 1180, y: 60, w: 220, h: 50 }, { x: 1320, y: 200, w: 60, h: 160 },
  { x: 80, y: 640, w: 120, h: 70 }, { x: 600, y: 600, w: 70, h: 70 }, { x: 820, y: 820, w: 90, h: 70 },
  { x: 1150, y: 640, w: 40, h: 70 }, { x: 1300, y: 600, w: 40, h: 70 }, { x: 1150, y: 840, w: 40, h: 70 },
  { x: 700, y: 180, w: 100, h: 30 },
];

const KEYS_RUMAH = [
  { id: 0, name: "Kunci Ruang Tamu", x: 380, y: 400 },
  { id: 1, name: "Kunci Lorong", x: 900, y: 90 },
  { id: 2, name: "Kunci Dapur", x: 1420, y: 430 },
  { id: 3, name: "Kunci Kamar Mandi", x: 90, y: 920 },
  { id: 4, name: "Kunci Gudang", x: 940, y: 600 },
];
const BATTERIES_RUMAH = [
  { id: 0, x: 250, y: 300 }, { id: 1, x: 620, y: 420 }, { id: 2, x: 1100, y: 250 },
  { id: 3, x: 350, y: 760 }, { id: 4, x: 720, y: 900 }, { id: 5, x: 1250, y: 940 },
];
const EXIT_RUMAH = { x: 1420, y: 760, r: 50 };
const HUNTER_SPAWNS_RUMAH = [{ x: 250, y: 260 }, { x: 160, y: 380 }, { x: 330, y: 220 }];
const GHOST_SPAWN_RUMAH = { x: 1250, y: 780 };

export function circleHitsRect(cx: number, cy: number, r: number, b: Rect) {
  const nx = Math.max(b.x, Math.min(cx, b.x + b.w));
  const ny = Math.max(b.y, Math.min(cy, b.y + b.h));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

export function move(x: number, y: number, dx: number, dy: number, r = PLAYER_R): { x: number; y: number } {
  const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8);
  if (steps > 1) {
    let p = { x, y };
    for (let i = 0; i < steps; i++) p = move(p.x, p.y, dx / steps, dy / steps, r);
    return p;
  }
  let nx = x + dx;
  if (WALLS.some((w) => circleHitsRect(nx, y, r, w))) nx = x;
  let ny = y + dy;
  if (WALLS.some((w) => circleHitsRect(nx, ny, r, w))) ny = y;
  return { x: nx, y: ny };
}

export function roomAt(x: number, y: number) {
  return ROOMS.find((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h)?.name ?? "";
}

/** NPC traps follow fixed loops so all clients agree without syncing. */
export type Npc = { kind: "kuntilanak" | "pocong"; x: number; y: number };
const NPC_RUMAH: { kind: Npc["kind"]; pts: [number, number][]; speed: number }[] = [
  { kind: "kuntilanak", pts: [[700, 100], [900, 380], [600, 380]], speed: 45 },
  { kind: "kuntilanak", pts: [[1060, 560], [1260, 560], [1420, 940], [1060, 940]], speed: 40 },
  { kind: "pocong", pts: [[120, 560], [420, 560], [420, 900], [250, 900]], speed: 55 },
  { kind: "pocong", pts: [[1100, 120], [1100, 420], [1250, 420]], speed: 50 },
];
export function npcsAt(seconds: number): Npc[] {
  return NPC_PATHS.map((p) => {
    const segs = p.pts.map((a, i) => {
      const b = p.pts[(i + 1) % p.pts.length]!;
      return { a, b, len: Math.hypot(b[0] - a[0], b[1] - a[1]) };
    });
    const total = segs.reduce((s, g) => s + g.len, 0);
    let d = (seconds * p.speed) % total;
    for (const s of segs) {
      if (d <= s.len) {
        const t = d / s.len;
        const hop = p.kind === "pocong" ? -Math.abs(Math.sin(seconds * 6)) * 14 : Math.sin(seconds * 2) * 6;
        return { kind: p.kind, x: s.a[0] + (s.b[0] - s.a[0]) * t, y: s.a[1] + (s.b[1] - s.a[1]) * t + hop };
      }
      d -= s.len;
    }
    return { kind: p.kind, x: p.pts[0]![0], y: p.pts[0]![1] };
  });
}

export type Outcome = "hunters" | "ghost" | null;
/** Hunters win once every hunter is out of play and at least one escaped; time-out with no escape = ghost. */
export function decideOutcome(hunters: { status: string }[], timeLeft: number): Outcome {
  const active = hunters.filter((h) => h.status === "alive").length;
  const escaped = hunters.filter((h) => h.status === "escaped").length;
  if (active === 0) return escaped > 0 ? "hunters" : "ghost";
  if (timeLeft <= 0) return escaped > 0 ? "hunters" : "ghost";
  return null;
}

export function roomCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join("");
}

export const BOT_GHOST_ID = "bot-ghost";
/**
 * Roles from lobby preferences: one random ghost among those who want to be the ghost.
 * Nobody wants it (or a solo player) -> everyone hunts and the AI ghost plays.
 */
export function assignRoles(players: { id: string; pref: string }[], rand = Math.random): { roles: Record<string, "ghost" | "hunter">; bot: boolean } {
  const want = players.filter((p) => p.pref === "ghost");
  const ghost = players.length >= 2 && want.length > 0 ? want[Math.floor(rand() * want.length)]!.id : null;
  const roles = Object.fromEntries(players.map((p) => [p.id, p.id === ghost ? "ghost" : "hunter"])) as Record<string, "ghost" | "hunter">;
  return { roles, bot: ghost === null };
}

/** AI ghost waypoints (room centres and doorways) used while it has no target. */
const BOT_PATROL_RUMAH: [number, number][] = [[1250, 760], [1000, 780], [750, 750], [750, 520], [500, 700], [250, 750], [250, 520], [250, 250], [500, 250], [750, 300], [1000, 320], [1250, 250], [1250, 520]];

// ---- Map 2: Villa Mewah (the living room is the uploaded 3D interior) ----
const ROOMS_VILLA: Room[] = [
  { name: "Ruang Keluarga Villa", x: 0, y: 0, w: 900, h: 600, floor: "#3a2a20", glb: true },
  { name: "Dapur Villa", x: 900, y: 0, w: 600, h: 600, floor: "#22201a" },
  { name: "Kamar Tidur", x: 0, y: 600, w: 500, h: 400, floor: "#2a1a24" },
  { name: "Kolam Belakang", x: 500, y: 600, w: 500, h: 400, floor: "#142024", outdoor: true },
  { name: "Garasi", x: 1000, y: 600, w: 500, h: 400, floor: "#1c1c1c" },
];
const DOORS_VILLA = [
  { x: 900, y: 300, v: true }, { x: 500, y: 800, v: true }, { x: 1000, y: 800, v: true },
  { x: 250, y: 600, v: false }, { x: 750, y: 600, v: false }, { x: 1200, y: 600, v: false },
];
const WALLS_VILLA: Rect[] = [
  ...hWall(0, T / 2, WORLD.w), ...hWall(0, WORLD.h - T / 2, WORLD.w),
  ...vWall(T / 2, 0, WORLD.h), ...vWall(WORLD.w - T / 2, 0, WORLD.h),
  ...vWall(900, 0, 600, 300), ...vWall(500, 600, 400, 800), ...vWall(1000, 600, 400, 800),
  ...hWall(0, 600, 500, 250), ...hWall(500, 600, 500, 750), ...hWall(1000, 600, 500, 1200),
  // furniture outside the 3D living room
  { x: 960, y: 40, w: 170, h: 50 }, { x: 1050, y: 250, w: 120, h: 60 }, { x: 60, y: 680, w: 160, h: 110 },
  { x: 620, y: 700, w: 260, h: 150 }, { x: 1150, y: 700, w: 200, h: 100 },
];
const KEYS_VILLA = [
  { id: 0, name: "Kunci Ruang Keluarga", x: 450, y: 540 },
  { id: 1, name: "Kunci Dapur", x: 1400, y: 520 },
  { id: 2, name: "Kunci Kamar", x: 420, y: 940 },
  { id: 3, name: "Kunci Kolam", x: 560, y: 950 },
  { id: 4, name: "Kunci Garasi", x: 1440, y: 940 },
];
const BATTERIES_VILLA = [
  { id: 0, x: 120, y: 540 }, { id: 1, x: 1100, y: 450 }, { id: 2, x: 300, y: 880 },
  { id: 3, x: 900, y: 940 }, { id: 4, x: 1100, y: 900 }, { id: 5, x: 800, y: 540 },
];
const NPC_VILLA: typeof NPC_RUMAH = [
  { kind: "kuntilanak", pts: [[1000, 150], [1400, 150], [1400, 450], [1000, 450]], speed: 42 },
  { kind: "pocong", pts: [[100, 840], [400, 700], [400, 900]], speed: 50 },
  { kind: "kuntilanak", pts: [[550, 650], [950, 650], [950, 950], [550, 950]], speed: 40 },
];

export type MapId = "rumah" | "villa";
export const MAPS: { id: MapId; name: string; desc: string }[] = [
  { id: "rumah", name: "Rumah Tua", desc: "6 ruangan, lorong, gudang & kuburan" },
  { id: "villa", name: "Villa Mewah", desc: "Ruang keluarga 3D, dapur, kamar, kolam & garasi" },
];
export let MAP_ID: MapId = "rumah";
export let ROOMS = ROOMS_RUMAH;
export let DOORS = DOORS_RUMAH;
export let WALLS: Rect[] = [...WALLS_RUMAH];
export let KEYS = KEYS_RUMAH;
export let BATTERIES = BATTERIES_RUMAH;
export let EXIT = EXIT_RUMAH;
export let HUNTER_SPAWNS = HUNTER_SPAWNS_RUMAH;
export let GHOST_SPAWN = GHOST_SPAWN_RUMAH;
export let BOT_PATROL = BOT_PATROL_RUMAH;
let NPC_PATHS = NPC_RUMAH;

/** Switch every client to the same map before the game scene is built. */
export function setMap(id: MapId) {
  if (id === MAP_ID) return;
  MAP_ID = id;
  const v = id === "villa";
  ROOMS = v ? ROOMS_VILLA : ROOMS_RUMAH;
  DOORS = v ? DOORS_VILLA : DOORS_RUMAH;
  WALLS = [...(v ? WALLS_VILLA : WALLS_RUMAH)];
  KEYS = v ? KEYS_VILLA : KEYS_RUMAH;
  BATTERIES = v ? BATTERIES_VILLA : BATTERIES_RUMAH;
  EXIT = v ? { x: 1420, y: 140, r: 50 } : EXIT_RUMAH;
  HUNTER_SPAWNS = v ? [{ x: 450, y: 300 }, { x: 380, y: 380 }, { x: 520, y: 380 }] : HUNTER_SPAWNS_RUMAH;
  GHOST_SPAWN = v ? { x: 1250, y: 880 } : GHOST_SPAWN_RUMAH;
  BOT_PATROL = v ? [[1250, 880], [1200, 650], [1200, 300], [1000, 300], [800, 300], [450, 300], [250, 500], [250, 700], [300, 850], [560, 800], [750, 920], [1000, 800], [1250, 880]] : BOT_PATROL_RUMAH;
  NPC_PATHS = v ? NPC_VILLA : NPC_RUMAH;
}

/** Furniture from the 3D model becomes solid, except where it would block a key, battery, spawn, exit or doorway. */
export function addSolids(rects: Rect[]) {
  const keep = [...KEYS, ...BATTERIES, ...HUNTER_SPAWNS, GHOST_SPAWN, EXIT, ...DOORS];
  for (const r of rects) {
    const m = 45;
    if (keep.some((p) => p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m)) continue;
    WALLS.push(r);
  }
}
