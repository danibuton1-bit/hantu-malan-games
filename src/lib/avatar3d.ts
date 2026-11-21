// Articulated low-poly 3D hunters (legs, arms, head) so other players see real walking, looking and emotes.
import * as THREE from "three";
import type { CharId } from "./art";

type Pal = { cover: number; top: number; pants: number; shoe: number; skirt?: number; hair?: number; pack?: number; torch: number; iris: string; girl: boolean };
const PAL: Record<CharId, Pal> = {
  raka: { cover: 0x17171b, top: 0x1b1b20, pants: 0x1f1f24, shoe: 0x141416, hair: 0x7a4a2a, torch: 0x2a2a2e, iris: "#4a3426", girl: false },
  aisyah: { cover: 0xf6b6cf, top: 0xf4a9c6, pants: 0x141416, shoe: 0xf2a6c4, skirt: 0xe37fa7, torch: 0xe7b62c, iris: "#6b3a30", girl: true },
  qila: { cover: 0x111114, top: 0x2f9f95, pants: 0x18181c, shoe: 0x1a1a1e, torch: 0x2a2a2e, iris: "#4a3426", girl: true },
  nabila: { cover: 0xb9a2e3, top: 0xa58bd6, pants: 0x7d63b8, shoe: 0x6a51a3, pack: 0x151518, torch: 0x2a2a2e, iris: "#4a3426", girl: true },
};
const SKIN = 0xf6d5bd;

type Face = "open" | "shut" | "shy";
const faceCache: Record<string, THREE.Texture> = {};
function faceTex(iris: string, girl: boolean, f: Face) {
  const key = `${iris}${girl}${f}`;
  if (faceCache[key]) return faceCache[key];
  const c = document.createElement("canvas"); c.width = 128; c.height = 96;
  const g = c.getContext("2d")!;
  g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#161012";
  for (const cx of [40, 88]) {
    if (f === "open") {
      g.fillStyle = "#fff"; g.beginPath(); g.ellipse(cx, 42, 13, 15, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = iris; g.beginPath(); g.ellipse(cx, 44, 10, 12.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#161012"; g.beginPath(); g.ellipse(cx, 46, 5, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(cx - 4, 38, 4, 0, Math.PI * 2); g.fill();
      g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 14, 34); g.quadraticCurveTo(cx, 22, cx + 14, 34); g.stroke();
    } else if (f === "shut") {
      g.lineWidth = 4; g.beginPath(); g.moveTo(cx - 12, 44); g.quadraticCurveTo(cx, 52, cx + 12, 44); g.stroke();
    } else {
      const d = cx < 64 ? 1 : -1; g.lineWidth = 5;
      g.beginPath(); g.moveTo(cx - 11 * d, 32); g.lineTo(cx + 9 * d, 42); g.lineTo(cx - 11 * d, 52); g.stroke();
    }
  }
  g.fillStyle = f === "shy" ? "rgba(255,70,105,.85)" : `rgba(241,154,160,${girl ? 0.6 : 0.25})`;
  for (const cx of [22, 106]) { g.beginPath(); g.ellipse(cx, 62, f === "shy" ? 14 : 9, f === "shy" ? 8 : 5, 0, 0, Math.PI * 2); g.fill(); }
  g.lineWidth = 3; g.beginPath();
  if (f === "shy") { g.moveTo(50, 76); for (let i = 0; i < 4; i++) g.quadraticCurveTo(53.5 + i * 7, 71, 57 + i * 7, 76); }
  else { g.moveTo(54, 74); g.quadraticCurveTo(64, 82, 74, 74); }
  g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (faceCache[key] = t);
}

function tagTex(name: string, color: string) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 56;
  const g = c.getContext("2d")!;
  g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  const w = Math.min(250, g.measureText(name).width + 28);
  g.fillStyle = "rgba(10,6,10,.72)"; g.beginPath(); g.roundRect((256 - w) / 2, 6, w, 44, 14); g.fill();
  g.fillStyle = color; g.fillText(name, 128, 29);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function nameTag(name: string, color = "#f4efe6") {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex(name.slice(0, 16), color), transparent: true, depthWrite: false }));
  s.scale.set(1.1, 0.24, 1); return s;
}

export type Avatar = { root: THREE.Group; update: (o: { dt: number; t: number; moving: boolean; pitch: number; emote: string | null }) => void };

export function buildAvatar(id: CharId, mat: (p: THREE.MeshStandardMaterialParameters) => THREE.Material, low: boolean): Avatar {
  const P = PAL[id]; const seg = low ? 6 : 12;
  const m = (color: number) => mat({ color, roughness: 0.85 });
  const box = (w: number, h: number, d: number, c: number) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m(c));
  const cap = (r: number, l: number, c: number) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, low ? 2 : 4, seg), m(c));
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  // legs (pivot at hip)
  const mkLeg = (x: number) => {
    const g = new THREE.Group(); g.position.set(x, 0.5, 0);
    const leg = cap(0.075, 0.3, P.pants); leg.position.y = -0.23; g.add(leg);
    const shoe = box(0.15, 0.09, 0.22, P.shoe); shoe.position.set(0, -0.46, -0.03); g.add(shoe);
    body.add(g); return g;
  };
  const legL = mkLeg(-0.1), legR = mkLeg(0.1);
  // torso
  const torso = box(0.42, 0.42, 0.25, P.top); torso.position.y = 0.73; body.add(torso);
  const belt = box(0.43, 0.05, 0.26, 0x0d0d0f); belt.position.y = 0.53; body.add(belt);
  if (P.skirt) { const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.2, seg), m(P.skirt)); sk.position.y = 0.45; body.add(sk); }
  if (P.pack) { const bp = box(0.32, 0.36, 0.14, P.pack); bp.position.set(0, 0.76, 0.19); body.add(bp); }
  if (id === "qila") for (let i = 0; i < 4; i++) { const st = box(0.425, 0.022, 0.255, 0xe9fbf7); st.position.y = 0.6 + i * 0.08; body.add(st); }
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), mat({ color: 0xd8ae45, metalness: 0.6, roughness: 0.4 }));
  badge.position.set(-0.11, 0.82, -0.127); badge.rotation.y = Math.PI; body.add(badge);
  // arms (pivot at shoulder). Facing -Z, the character's right is +X.
  const mkArm = (x: number, torch: boolean) => {
    const g = new THREE.Group(); g.position.set(x, 0.9, 0);
    const a = cap(0.06, 0.28, P.top); a.position.y = -0.2; g.add(a);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.06, seg, seg), m(SKIN)); h.position.y = -0.4; g.add(h);
    if (torch) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.22, seg), mat({ color: P.torch, metalness: 0.6, roughness: 0.4 }));
      t.rotation.x = Math.PI / 2; t.position.set(0, -0.42, -0.09); g.add(t);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.034, 10), new THREE.MeshBasicMaterial({ color: 0xfff6d8 }));
      lens.position.set(0, -0.42, -0.201); lens.rotation.y = Math.PI; g.add(lens);
    }
    body.add(g); return g;
  };
  const armR = mkArm(0.27, true), armL = mkArm(-0.27, false);
  // head (pivot at neck)
  const head = new THREE.Group(); head.position.y = 0.95; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.26, seg + 4, seg), m(SKIN)); skull.position.y = 0.27; head.add(skull);
  // hijab / hood: shell around the back and top, open at the face
  const cover = new THREE.Mesh(new THREE.SphereGeometry(0.29, seg + 4, seg, Math.PI * 1.82, Math.PI * 1.36), m(P.cover));
  cover.position.y = 0.28; head.add(cover);
  const cap2 = new THREE.Mesh(new THREE.SphereGeometry(0.292, seg + 4, seg / 2, 0, Math.PI * 2, 0, Math.PI * 0.3), m(P.cover)); cap2.position.y = 0.28; head.add(cap2);
  if (P.girl) { const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.33, 0.24, seg + 4), m(P.cover)); drape.position.y = 0.02; head.add(drape); }
  else { const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.12, seg + 4), m(P.cover)); hood.position.y = 0.04; head.add(hood); }
  if (P.hair) { const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.262, seg + 4, seg / 2, Math.PI * 1.1, Math.PI * 0.8, 0, Math.PI * 0.32), m(P.hair)); fringe.position.y = 0.285; head.add(fringe); }
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex(P.iris, P.girl, "open"), transparent: true });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), faceMat);
  face.position.set(0, 0.24, -0.262); face.rotation.y = Math.PI; head.add(face);

  let ph = 0, blinkAt = 2 + Math.random() * 3, curFace: Face = "open";
  const setFace = (f: Face) => { if (f !== curFace) { curFace = f; faceMat.map = faceTex(P.iris, P.girl, f); faceMat.needsUpdate = true; } };
  const update: Avatar["update"] = ({ dt, t, moving, pitch, emote }) => {
    if (moving) ph += dt * 10; else ph *= Math.exp(-dt * 8);
    const sw = moving ? Math.sin(ph) : Math.sin(ph) * 0.3;
    legL.rotation.set(sw * 0.65, 0, 0); legR.rotation.set(-sw * 0.65, 0, 0);
    armL.rotation.set(-sw * 0.5, 0, -0.08); armR.rotation.set(sw * 0.35 + 0.5, 0, 0.08);
    body.position.y = moving ? Math.abs(Math.cos(ph)) * 0.04 : Math.sin(t * 2) * 0.006;
    body.rotation.set(0, 0, 0);
    head.rotation.set(Math.max(-0.6, Math.min(0.6, pitch * 0.7)), 0, 0);
    const e = emote, s = (k: number) => Math.sin(t * k);
    if (e === "wave") armL.rotation.set(0, 0, -(2.5 + s(12) * 0.35));
    else if (e === "dance") { body.rotation.z = s(7) * 0.18; body.position.y = Math.abs(s(7)) * 0.08; armL.rotation.set(0, 0, -(1.8 + s(14) * 0.6)); armR.rotation.set(0, 0, 1.8 - s(14) * 0.6); legL.rotation.x = s(7) * 0.4; legR.rotation.x = -s(7) * 0.4; }
    else if (e === "laugh") { body.position.y = Math.abs(s(22)) * 0.03; head.rotation.x = 0.35; armL.rotation.set(0.6, 0, 0.5); armR.rotation.set(0.6, 0, -0.5); }
    else if (e === "salute") armL.rotation.set(2.5, 0, 0.75);
    else if (e === "victory") { armL.rotation.set(0, 0, -(2.8 + s(16) * 0.25)); body.position.y = Math.abs(s(9)) * 0.14; }
    else if (e === "scared") { body.position.x = s(60) * 0.015; armL.rotation.set(2.4, 0, 0.5); armR.rotation.set(2.4, 0, -0.5); head.rotation.x = -0.2; }
    else if (e === "shy") { body.rotation.z = s(5) * 0.08; armL.rotation.set(2.3, 0, 0.85); armR.rotation.set(2.3, 0, -0.85); head.rotation.set(-0.25, 0, s(5) * 0.12); legL.rotation.z = 0.08; legR.rotation.z = -0.08; }
    else if (e === "hug") { armL.rotation.set(1.45, 0, 0.55 + s(6) * 0.06); armR.rotation.set(1.45, 0, -0.55 - s(6) * 0.06); body.rotation.x = -0.08; }
    else if (e === "kiss") { body.rotation.x = -0.14 - Math.abs(s(4)) * 0.06; head.rotation.x = -0.25; armL.rotation.set(1.3, 0, 0.4); }
    if (body.position.x && e !== "scared") body.position.x = 0;
    // eyes
    if (e === "shy") setFace("shy");
    else if (e === "laugh") setFace("shut");
    else { blinkAt -= dt; if (blinkAt < 0) { setFace("shut"); if (blinkAt < -0.13) { blinkAt = 2.5 + Math.random() * 3; setFace("open"); } } else setFace("open"); }
  };
  return { root, update };
}
