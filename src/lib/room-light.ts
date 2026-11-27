/** Lit interiors automatically disable the torch and preserve its battery. */
export function flashlightActive(roomLit: boolean) { return !roomLit; }
export function flashlightBattery(battery: number, dt: number, roomLit: boolean) {
  return roomLit ? battery : Math.max(0, battery - dt * 1.1);
}