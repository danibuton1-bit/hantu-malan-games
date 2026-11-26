import { describe, expect, it } from "vitest";
import { assignRoles, decideOutcome, GAME_SECONDS, move, TOTAL_KEYS, KEYS } from "./game";

describe("aturan game", () => {
  it("waktu main 5 menit dan 5 kunci", () => {
    expect(GAME_SECONDS).toBe(300);
    expect(TOTAL_KEYS).toBe(5);
    expect(KEYS).toHaveLength(5);
  });
  it("hantu menang kalau semua pemburu tertangkap", () => {
    expect(decideOutcome([{ status: "caught" }, { status: "caught" }], 100)).toBe("ghost");
  });
  it("hantu menang kalau waktu habis tanpa ada yang kabur", () => {
    expect(decideOutcome([{ status: "alive" }], 0)).toBe("ghost");
  });
  it("pemburu menang kalau ada yang kabur dan sisanya selesai", () => {
    expect(decideOutcome([{ status: "escaped" }, { status: "caught" }], 50)).toBe("hunters");
  });
  it("game lanjut selama ada pemburu hidup dan waktu tersisa", () => {
    expect(decideOutcome([{ status: "alive" }, { status: "escaped" }], 50)).toBeNull();
  });
  it("tembok menghalangi gerakan", () => {
    expect(move(30, 300, -50, 0).x).toBe(30);
  });
});

describe("assignRoles", () => {
  it("uses the AI ghost when every player chose a hunter", () => {
    const r = assignRoles([{ id: "a", pref: "hunter" }, { id: "b", pref: "hunter" }]);
    expect(r.bot).toBe(true);
    expect(Object.values(r.roles)).toEqual(["hunter", "hunter"]);
  });
  it("makes exactly one ghost out of the players who asked", () => {
    const r = assignRoles([{ id: "a", pref: "ghost" }, { id: "b", pref: "ghost" }, { id: "c", pref: "hunter" }], () => 0.9);
    expect(r.bot).toBe(false);
    expect(r.roles).toEqual({ a: "hunter", b: "ghost", c: "hunter" });
  });
  it("a solo player always hunts against the AI ghost", () => {
    const r = assignRoles([{ id: "a", pref: "ghost" }]);
    expect(r).toEqual({ roles: { a: "hunter" }, bot: true });
  });
});

import * as G from "./game";
describe("villa map", () => {
  it("switches every client to the villa layout with 5 reachable keys", () => {
    G.setMap("villa");
    expect(G.KEYS).toHaveLength(5);
    for (const k of G.KEYS) expect(G.WALLS.some((w) => G.circleHitsRect(k.x, k.y, G.PLAYER_R, w))).toBe(false);
    expect(G.DOORS.length).toBeGreaterThanOrEqual(6);
  });
  it("3D furniture never blocks a key", () => {
    const before = G.WALLS.length;
    G.addSolids([{ x: G.KEYS[0]!.x - 10, y: G.KEYS[0]!.y - 10, w: 20, h: 20 }]);
    expect(G.WALLS.length).toBe(before);
    G.setMap("rumah");
  });
});
