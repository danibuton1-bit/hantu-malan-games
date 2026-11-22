// First-person 3D renderer for the shared 2D game world. World px -> meters via U.
import * as THREE from "three";
import { BATTERIES, DOORS, DOOR_W, EXIT, KEYS, ROOMS, WALLS, WORLD } from "./game";
import { audio } from "./audio";
import { CHARACTERS, isChar, type CharId } from "./art";
import { buildAvatar, nameTag, type Avatar } from "./avatar3d";

export const U = 1 / 50;
/** Weak/old Android phones: lower resolution, cheaper lights and materials, 30 fps. */
export const LOW_END = typeof navigator !== "undefined" && typeof window !== "undefined" && (
  ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4 ||
  (/Android/i.test(navigator.userAgent) && Math.min(screen.width, screen.height) * (window.devicePixelRatio || 1) < 1100));
const MOBILE = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
const Mat = (p: THREE.MeshStandardMaterialParameters) => (LOW_END ? new THREE.MeshLambertMaterial({ color: p.color ?? 0xffffff, map: p.map ?? null, emissive: p.emissive ?? 0, emissiveIntensity: p.emissiveIntensity ?? 1, transparent: p.transparent ?? false, opacity: p.opacity ?? 1 }) as unknown as THREE.MeshStandardMaterial : new THREE.MeshStandardMaterial(p));
export const EYE = 1.6;
const WALL_H = 3.2;

function canvasTex(draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: number) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  draw(c.getContext("2d")!, 256);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const woodTex = (base: string) => canvasTex((g, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = `rgba(0,0,0,${0.15 + (i % 3) * 0.08})`; g.fillRect(0, i * 32, s, 2);
    for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * s, i * 32 + Math.random() * 30, 20 + Math.random() * 60, 1); }
  }
}, 1);
const wallTex = canvasTex((g, s) => {
  g.fillStyle = "#4a3a34"; g.fillRect(0, 0, s, s);
  for (let x = 0; x < s; x += 32) { g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x, 0, 3, s); g.fillStyle = "rgba(120,90,70,.15)"; for (let y = 8; y < s; y += 40) g.fillRect(x + 12, y, 8, 8); }
  for (let k = 0; k < 6; k++) { const x = Math.random() * s; const gr = g.createLinearGradient(x, 0, x, s); gr.addColorStop(0, "rgba(40,10,10,.5)"); gr.addColorStop(1, "rgba(40,10,10,0)"); g.fillStyle = gr; g.fillRect(x, 0, 4 + Math.random() * 6, s * Math.random()); }
  g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(0, s - 30, s, 30);
}, 1);

type Ent = { sprite: THREE.Sprite; light?: THREE.PointLight };

export function createScene(canvas: HTMLCanvasElement, opts: { me: CharId | "ghost"; amGhost: boolean; imgs: Record<string, string> }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE && !LOW_END, powerPreference: LOW_END ? "low-power" : "high-performance" });
  renderer.setPixelRatio(LOW_END ? 0.75 : MOBILE ? Math.min(1.25, window.devicePixelRatio || 1) : Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = LOW_END ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  // ghost sees in the dark: bright violet "night vision", thin fog
  const fogCol = opts.amGhost ? 0x1c0a2a : 0x000000;
  scene.background = new THREE.Color(fogCol);
  scene.fog = new THREE.FogExp2(fogCol, opts.amGhost ? 0.035 : 0.11);
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 60);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(opts.amGhost ? 0xc9a0ff : 0x2a2440, opts.amGhost ? 0x402050 : 0x080404, opts.amGhost ? 2.6 : LOW_END ? 0.32 : 0.22));
  if (opts.amGhost) scene.add(new THREE.AmbientLight(0x9070c0, 0.8));

  // floors and ceilings per room
  for (const r of ROOMS) {
    const outdoor = r.name.startsWith("Kuburan");
    const tex = outdoor ? canvasTex((g, s) => { g.fillStyle = "#1a2414"; g.fillRect(0, 0, s, s); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${60 + Math.random() * 50},30,.6)`; g.fillRect(Math.random() * s, Math.random() * s, 2, 5); } }, 1) : woodTex(r.floor === "#18222a" ? "#2b3a40" : "#4a2e1e");
    tex.repeat.set(r.w * U / 3, r.h * U / 3);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(r.w * U, r.h * U), Mat({ map: tex, roughness: 0.9 }));
    f.rotation.x = -Math.PI / 2; f.position.set((r.x + r.w / 2) * U, 0, (r.y + r.h / 2) * U); scene.add(f);
    if (!outdoor) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(r.w * U, r.h * U), Mat({ color: 0x1a1414, roughness: 1 }));
      c.rotation.x = Math.PI / 2; c.position.set((r.x + r.w / 2) * U, WALL_H, (r.y + r.h / 2) * U); scene.add(c);
    }
  }
  // walls & furniture (first boxes are structural walls; thin ones => walls)
  const wallMat = Mat({ map: wallTex, roughness: 0.95 });
  const furnMat = Mat({ map: woodTex("#3a2214"), roughness: 0.8 });
  for (const w of WALLS) {
    const isWall = Math.min(w.w, w.h) <= 20;
    const h = isWall ? WALL_H : 0.9;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w.w * U, h, w.h * U), isWall ? wallMat : furnMat);
    m.position.set((w.x + w.w / 2) * U, h / 2, (w.y + w.h / 2) * U); scene.add(m);
  }
  // doors (auto-swing open when anyone is near)
  const doorMat = Mat({ map: woodTex("#4a2c18"), roughness: 0.9 });
  const doors = DOORS.map((d) => {
    const pivot = new THREE.Group();
    const w = DOOR_W * U * 0.96, h = WALL_H * 0.85;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), doorMat);
    panel.position.set(w / 2, h / 2, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), Mat({ color: 0xc9a040 }));
    knob.position.set(w - 0.15, h * 0.5, 0.07); pivot.add(panel, knob);
    if (d.v) { pivot.position.set(d.x * U, 0, (d.y - DOOR_W / 2) * U); pivot.rotation.y = -Math.PI / 2; }
    else pivot.position.set((d.x - DOOR_W / 2) * U, 0, d.y * U);
    scene.add(pivot);
    return { d, pivot, base: pivot.rotation.y, open: 0, was: false };
  });
  // graves
  const graveMat = Mat({ color: 0x5a5d58, roughness: 1 });
  for (const [gx, gy] of [[1060, 600], [1260, 640], [1380, 880], [1080, 900]] as const) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.2), graveMat); g.position.set((gx + 17) * U, 0.55, (gy + 22) * U); g.rotation.z = 0.08; scene.add(g);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16, 1, false, 0, Math.PI), graveMat); top.rotation.set(Math.PI / 2, 0, Math.PI / 2); top.position.set((gx + 17) * U, 1.1, (gy + 22) * U); scene.add(top);
  }
  // exit gate
  const gateMat = Mat({ color: 0x8b0d17, emissive: 0x8b0d17, emissiveIntensity: 0.6 });
  const gate = new THREE.Mesh(new THREE.TorusGeometry(EXIT.r * U, 0.08, 8, 32), gateMat);
  gate.position.set(EXIT.x * U, EXIT.r * U + 0.1, EXIT.y * U); gate.rotation.y = Math.PI / 2; scene.add(gate);
  const gateLight = new THREE.PointLight(0x8b0d17, 2, 5); gateLight.position.copy(gate.position); scene.add(gateLight);

  const tl = new THREE.TextureLoader();
  const texCache: Record<string, THREE.Texture> = {};
  const tex = (k: string) => (texCache[k] ??= (() => { const t = tl.load(opts.imgs[k]!); t.colorSpace = THREE.SRGBColorSpace; return t; })());
  const sprite = (k: string, w: number, h: number) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(k), transparent: true, alphaTest: 0.1 }));
    s.scale.set(w, h, 1); scene.add(s); return s;
  };
  const keys = KEYS.map((k) => { const s = sprite("key", 0.6, 0.3); s.position.set(k.x * U, 0.6, k.y * U); const l = new THREE.PointLight(0xffc840, 0.8, 2.5); l.position.copy(s.position); if (!LOW_END) scene.add(l); return { sprite: s, light: l } as Ent; });
  const bats = BATTERIES.map((b) => { const s = sprite("bat", 0.25, 0.4); s.position.set(b.x * U, 0.3, b.y * U); const l = new THREE.PointLight(0x60ff80, 0.5, 1.8); l.position.copy(s.position); if (!LOW_END) scene.add(l); return { sprite: s, light: l } as Ent; });
  const npcSprites: Record<string, THREE.Sprite> = {};
  const players: Record<string, { sprite: THREE.Sprite | null; av: Avatar | null; tag: THREE.Sprite | null; light: THREE.SpotLight; target: THREE.Object3D; shout: THREE.Sprite }> = {};

  // flashlight (attached to camera)
  const flash = new THREE.SpotLight(0xfff1d0, 30, 22, 0.42, 0.45, 1.6);
  flash.position.set(0.25, -0.25, 0); camera.add(flash);
  const ft = new THREE.Object3D(); ft.position.set(0, -0.1, -5); camera.add(ft); flash.target = ft;
  // viewmodel hand holding torch
  const vm = new THREE.Group(); camera.add(vm);
  const look = opts.me === "ghost" ? null : CHARACTERS[opts.me];
  if (look) {
    const sleeve = Mat({ color: look.top, roughness: 0.9 });
    const skin = Mat({ color: 0xd9a77e, roughness: 0.7 });
    const metal = Mat({ color: look.torch, metalness: 0.7, roughness: 0.35 });
    // forearm (rounded sleeve) + cuff + palm + 4 curled fingers + thumb wrapped round the torch
    const cap = (r: number, l: number, m: THREE.Material) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, LOW_END ? 3 : 6, LOW_END ? 6 : 12), m);
    const buildHand = (side: 1 | -1, holding: boolean) => {
      const g = new THREE.Group();
      const fore = cap(0.055, 0.36, sleeve); fore.rotation.x = Math.PI / 2; fore.position.set(0, 0, 0.12);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.04, 14), skin); cuff.rotation.x = Math.PI / 2; cuff.position.set(0, 0, -0.08);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.045, 0.09), skin); palm.position.set(0, 0, -0.14);
      g.add(fore, cuff, palm);
      for (let i = 0; i < 4; i++) {
        const f = cap(0.012, holding ? 0.03 : 0.05, skin);
        f.position.set(-0.03 + i * 0.02, holding ? 0.025 : -0.005, holding ? -0.19 : -0.205);
        f.rotation.x = holding ? -0.2 : Math.PI / 2 + 0.25; g.add(f);
      }
      const th = cap(0.013, 0.035, skin); th.position.set(side * -0.05, 0.02, -0.15); th.rotation.set(0.6, 0, side * 0.9); g.add(th);
      return g;
    };
    const rightH = buildHand(1, true); rightH.position.set(0.28, -0.3, -0.42); rightH.rotation.x = 0.12;
    const leftH = buildHand(-1, false); leftH.position.set(-0.33, -0.38, -0.38); leftH.rotation.set(0.25, 0.15, 0.1);
    const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.26, 14), metal); torch.rotation.x = Math.PI / 2; torch.position.set(0.28, -0.27, -0.66);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.08, 14), metal); head.rotation.x = Math.PI / 2; head.position.set(0.28, -0.27, -0.82);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.042, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); lens.position.set(0.28, -0.27, -0.861);
    vm.add(rightH, leftH, torch, head, lens);
    vm.userData["lens"] = lens;
  } else {
    // ghost: smoky dark claws
    const smoke = Mat({ color: 0x1a0a22, emissive: 0x400010, transparent: true, opacity: 0.85 });
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.3, 6), smoke); c.rotation.x = -Math.PI / 2 - 0.3; c.position.set(sx * 0.32 + (i - 1) * 0.05, -0.35, -0.55); vm.add(c); }
    flash.color.set(0x9a2040); flash.intensity = 6;
  }
  vm.traverse((o) => { o.renderOrder = 10; const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m) { m.depthTest = false; (m as THREE.MeshStandardMaterial).fog = false; } });

  let bobT = 0, vmX = 0;
  return {
    resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); vmX = w < h ? -0.13 : 0; vm.scale.setScalar(w < h ? 0.8 : 1);
    },
    ensurePlayer(id: string, k: string, isHunter: boolean, name = "") {
      if (players[id]) return;
      const av = isHunter && isChar(k) ? buildAvatar(k, Mat as unknown as (p: THREE.MeshStandardMaterialParameters) => THREE.Material, LOW_END) : null;
      if (av) scene.add(av.root);
      const s = av ? null : sprite(k, isHunter ? 1.15 : 1.9, isHunter ? 1.6 : 2.4);
      const tag = isHunter && name ? nameTag(name) : null; if (tag) scene.add(tag);
      const light = new THREE.SpotLight(0xfff1d0, isHunter ? 12 : 0, 14, 0.4, 0.5, 1.6);
      const target = new THREE.Object3D(); scene.add(light, target); light.target = target;
      const shout = sprite("ex", 0.35, 0.5); shout.visible = false;
      players[id] = { sprite: s, av, tag, light, target, shout };
    },
    frame(st: {
      dt: number; t: number; cam: { x: number; y: number }; yaw: number; pitch: number; moving: boolean; battery: number; near: number;
      keyMask: number; batMask: number; npcs: { kind: string; x: number; y: number }[];
      others: { id: string; x: number; y: number; yaw: number; visible: boolean; shouting: boolean; ghost: boolean; moving: boolean; pitch: number; emote: string | null }[];
      firstPerson: boolean;
    }) {
      for (const dr of doors) {
        const near = [st.cam, ...st.others.filter((o) => o.visible || o.ghost)].some((p) => Math.hypot(p.x - dr.d.x, p.y - dr.d.y) < 120);
        if (near && !dr.was && Math.hypot(st.cam.x - dr.d.x, st.cam.y - dr.d.y) < 160) audio.creak();
        dr.was = near;
        dr.open += ((near ? 1 : 0) - dr.open) * Math.min(1, st.dt * 4);
        dr.pivot.rotation.y = dr.base + dr.open * 1.6;
      }
      if (st.moving) bobT += st.dt * 9;
      const bob = st.firstPerson ? Math.sin(bobT) * 0.04 : 0;
      const shake = st.near > 0.55 ? (Math.random() - 0.5) * st.near * 0.03 : 0;
      camera.position.set(st.cam.x * U, EYE + Math.abs(bob), st.cam.y * U);
      camera.rotation.set(st.pitch + shake, st.yaw, 0);
      vm.visible = st.firstPerson;
      vm.position.set(vmX + Math.cos(bobT * 0.5) * 0.02, bob * 0.6, 0);
      // flashlight power
      if (!opts.amGhost) {
        const flick = st.battery < 20 ? (Math.random() < 0.15 ? 0.2 : 1) : Math.random() < 0.008 ? 0.5 : 1;
        const p = st.battery <= 0 ? 0.04 : (0.25 + st.battery / 100 * 0.75) * flick;
        flash.intensity = 45 * p; flash.distance = 8 + 16 * p;
        const lens = vm.userData["lens"] as THREE.Mesh | undefined;
        if (lens) (lens.material as THREE.MeshBasicMaterial).color.setScalar(0.3 + p * 0.7);
      }
      const open = st.keyMask === 31;
      gateMat.color.set(open ? 0x59e36b : 0x8b0d17); gateMat.emissive.set(open ? 0x59e36b : 0x8b0d17); gateLight.color.set(open ? 0x59e36b : 0x8b0d17);
      keys.forEach((k, i) => { const on = !(st.keyMask & (1 << i)); k.sprite.visible = on; k.light!.visible = on; k.sprite.position.y = 0.6 + Math.sin(st.t * 3 + i) * 0.08; });
      bats.forEach((b, i) => { const on = !(st.batMask & (1 << i)); b.sprite.visible = on; b.light!.visible = on; });
      st.npcs.forEach((n, i) => {
        const key = `npc${i}`;
        const s = (npcSprites[key] ??= sprite(n.kind === "pocong" ? "pocong" : "kunti", 1.1, 1.9));
        s.position.set(n.x * U, 0.95 + (n.kind === "pocong" ? Math.abs(Math.sin(st.t * 4)) * 0.25 : Math.sin(st.t * 2) * 0.1 + 0.2), n.y * U);
      });
      for (const o of st.others) {
        const p = players[o.id]; if (!p) continue;
        p.light.visible = o.visible && !o.ghost;
        if (p.av) {
          p.av.root.visible = o.visible; p.av.root.position.set(o.x * U, 0, o.y * U); p.av.root.rotation.y = o.yaw;
          if (o.visible) p.av.update({ dt: st.dt, t: st.t, moving: o.moving, pitch: o.pitch, emote: o.emote });
        }
        if (p.sprite) {
          p.sprite.visible = o.visible;
          const h = o.ghost ? 1.3 + Math.sin(st.t * 2.5) * 0.1 : 0.8;
          p.sprite.position.set(o.x * U, h, o.y * U);
          if (o.ghost) (p.sprite.material as THREE.SpriteMaterial).opacity = 0.75 + Math.sin(st.t * 4) * 0.15;
        }
        if (p.tag) { p.tag.visible = o.visible; p.tag.position.set(o.x * U, 1.78, o.y * U); }
        p.light.position.set(o.x * U, 1.2, o.y * U);
        p.target.position.set(o.x * U - Math.sin(o.yaw) * 5, 0.6, o.y * U - Math.cos(o.yaw) * 5);
        p.shout.visible = o.visible && o.shouting; p.shout.position.set(o.x * U, 2.1 + Math.sin(st.t * 12) * 0.05, o.y * U);
      }
      renderer.render(scene, camera);
    },
    dispose() { renderer.dispose(); },
  };
}
export { WORLD };
