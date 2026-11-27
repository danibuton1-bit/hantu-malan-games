import { expect, it } from "vitest";
import { flashlightActive, flashlightBattery } from "./room-light";

it("automatically turns the flashlight off in a lit room", () => {
  expect(flashlightActive(true)).toBe(false);
  expect(flashlightActive(false)).toBe(true);
});
it("saves battery while the room light is on", () => {
  expect(flashlightBattery(80, 10, true)).toBe(80);
  expect(flashlightBattery(80, 10, false)).toBe(69);
});