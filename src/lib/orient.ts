// Portrait screens are rotated 90deg clockwise by CSS (.landscape-wrap) so the game always plays landscape.
export const isRotated = () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches;
/** Convert a screen-space delta into the rotated content's space. */
export function toContent(dx: number, dy: number) {
  return isRotated() ? { x: dy, y: -dx } : { x: dx, y: dy };
}
export async function tryLockLandscape() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    await (screen.orientation as unknown as { lock?: (o: string) => Promise<void> }).lock?.("landscape");
  } catch { /* unsupported: CSS rotation fallback handles it */ }
}
