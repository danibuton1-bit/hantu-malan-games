import { describe, expect, it } from "vitest";
import { decideOutcome, GAME_SECONDS, move, TOTAL_KEYS, KEYS } from "./game";

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
