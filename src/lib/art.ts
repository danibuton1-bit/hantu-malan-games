// All game art is generated as SVG strings: reused by React (<img>) and canvas (Image).
export type CharId = "raka" | "aisyah" | "zahra" | "nabila";

export const CHARACTERS: Record<CharId, { nama: string; desc: string; hijab?: string; hijabShade?: string; hair?: string; top: string; topShade: string; bottom: string; torch: string; face: "serius" | "ceria" | "berani" | "kalem"; skirt?: boolean }> = {
  raka: { nama: "RAKA", desc: "Cowok pemburu. Serius dan tenang.", hair: "#6b4226", top: "#151518", topShade: "#26262c", bottom: "#101012", torch: "#cfcfcf", face: "serius" },
  aisyah: { nama: "AISYAH", desc: "Pemburu ceria berhijab pink.", hijab: "#f6b6cf", hijabShade: "#e795b5", top: "#f08fb4", topShade: "#d9709a", bottom: "#f4a6c4", torch: "#f5d23a", face: "ceria", skirt: true },
  zahra: { nama: "ZAHRA", desc: "Pemburu berani, hijab hitam elegan.", hijab: "#121214", hijabShade: "#2a2a30", top: "#18181b", topShade: "#2b2b31", bottom: "#141416", torch: "#f2f2f2", face: "berani" },
  nabila: { nama: "NABILA", desc: "Pemburu kalem berhijab lavender.", hijab: "#c7b2ec", hijabShade: "#a891d6", top: "#b9a3e6", topShade: "#9a83cf", bottom: "#6b5a8f", torch: "#d9d9d9", face: "kalem" },
};
export const CHAR_IDS = Object.keys(CHARACTERS) as CharId[];
export const isChar = (v: unknown): v is CharId => typeof v === "string" && v in CHARACTERS;

const SKIN = "#f1c7a3";

function face(kind: string) {
  const eyes =
    kind === "ceria"
      ? `<path d="M38 53 q4 -5 8 0" stroke="#2a1a14" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M54 53 q4 -5 8 0" stroke="#2a1a14" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : kind === "kalem"
        ? `<path d="M37 54 q5 3 9 0" stroke="#2a1a14" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M54 54 q5 3 9 0" stroke="#2a1a14" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
        : `<ellipse cx="42" cy="54" rx="3" ry="3.6" fill="#1d120d"/><ellipse cx="58" cy="54" rx="3" ry="3.6" fill="#1d120d"/><circle cx="43" cy="53" r="1" fill="#fff"/><circle cx="59" cy="53" r="1" fill="#fff"/>`;
  const brows =
    kind === "serius" || kind === "berani"
      ? `<path d="M36 46 l10 3" stroke="#2a1a14" stroke-width="2.4" stroke-linecap="round"/><path d="M64 46 l-10 3" stroke="#2a1a14" stroke-width="2.4" stroke-linecap="round"/>`
      : `<path d="M37 47 q5 -3 9 0" stroke="#2a1a14" stroke-width="1.8" fill="none"/><path d="M54 47 q5 -3 9 0" stroke="#2a1a14" stroke-width="1.8" fill="none"/>`;
  const mouth =
    kind === "ceria"
      ? `<path d="M43 63 q7 8 14 0 z" fill="#b8323f"/>`
      : kind === "berani"
        ? `<path d="M44 64 q6 3 12 -1" stroke="#7a2a2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
        : kind === "kalem"
          ? `<path d="M45 64 q5 3 10 0" stroke="#9a4a4a" stroke-width="2" fill="none" stroke-linecap="round"/>`
          : `<path d="M44 65 h12" stroke="#5a2a2a" stroke-width="2.2" stroke-linecap="round"/>`;
  const blush = kind === "ceria" || kind === "kalem" ? `<ellipse cx="36" cy="60" rx="4" ry="2.4" fill="#f29a9a" opacity=".6"/><ellipse cx="64" cy="60" rx="4" ry="2.4" fill="#f29a9a" opacity=".6"/>` : "";
  return brows + eyes + blush + mouth;
}

export function characterSvg(id: CharId): string {
  const c = CHARACTERS[id];
  const head = c.hijab
    ? `<path d="M22 58 Q20 22 50 20 Q80 22 78 58 L84 92 Q50 104 16 92 Z" fill="${c.hijab}"/><path d="M16 92 Q50 104 84 92 L80 84 Q50 94 20 84Z" fill="${c.hijabShade}"/><ellipse cx="50" cy="56" rx="20" ry="22" fill="${SKIN}"/><path d="M28 50 Q30 28 50 28 Q70 28 72 50 Q66 38 50 37 Q34 38 28 50Z" fill="${c.hijabShade}"/>`
    : `<ellipse cx="50" cy="56" rx="21" ry="23" fill="${SKIN}"/><path d="M27 52 Q22 22 50 22 Q80 22 74 52 Q70 38 60 36 Q52 42 40 38 Q32 42 27 52Z" fill="${c.hair}"/><path d="M24 30 Q50 6 78 30 Q62 22 50 24 Q36 22 24 30Z" fill="#5a3620"/><path d="M18 72 Q20 40 50 38" stroke="${c.top}" stroke-width="7" fill="none" opacity=".9"/><path d="M82 72 Q80 40 50 38" stroke="${c.top}" stroke-width="7" fill="none" opacity=".9"/>`;
  const legs = c.skirt
    ? `<path d="M30 104 L70 104 L78 128 L22 128Z" fill="${c.bottom}"/><rect x="36" y="127" width="9" height="8" fill="${SKIN}"/><rect x="55" y="127" width="9" height="8" fill="${SKIN}"/>`
    : `<rect x="34" y="104" width="13" height="28" rx="3" fill="${c.bottom}"/><rect x="53" y="104" width="13" height="28" rx="3" fill="${c.bottom}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
${legs}
<ellipse cx="40" cy="135" rx="9" ry="4" fill="#0b0b0c"/><ellipse cx="60" cy="135" rx="9" ry="4" fill="#0b0b0c"/>
<path d="M26 84 Q50 74 74 84 L76 108 L24 108Z" fill="${c.top}"/>
<path d="M50 80 L50 108" stroke="${c.topShade}" stroke-width="2.5"/>
${c.hijab ? "" : `<path d="M36 82 Q50 92 64 82" stroke="${c.topShade}" stroke-width="3" fill="none"/>`}
<rect x="16" y="86" width="12" height="22" rx="6" fill="${c.top}"/><rect x="72" y="86" width="12" height="22" rx="6" fill="${c.top}"/>
<circle cx="22" cy="110" r="5" fill="${SKIN}"/><circle cx="78" cy="110" r="5" fill="${SKIN}"/>
<rect x="74" y="104" width="22" height="9" rx="3" fill="#3a3a40" transform="rotate(-20 78 108)"/>
<circle cx="96" cy="100" r="6" fill="${c.torch}" opacity=".95"/>
${head}
${face(c.face)}
</svg>`;
}

export function ghostSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200">
<defs><radialGradient id="gg" cx="50%" cy="35%" r="65%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".7" stop-color="#dfe3ea" stop-opacity=".8"/><stop offset="1" stop-color="#b9c0cc" stop-opacity=".35"/></radialGradient></defs>
<path d="M30 70 Q8 100 4 150 Q14 140 18 126" stroke="url(#gg)" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M130 70 Q152 100 156 150 Q146 140 142 126" stroke="url(#gg)" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M2 150 l-2 10 M6 152 l2 10 M10 150 l6 8" stroke="#d6dbe3" stroke-width="3" stroke-linecap="round"/>
<path d="M158 150 l2 10 M154 152 l-2 10 M150 150 l-6 8" stroke="#d6dbe3" stroke-width="3" stroke-linecap="round"/>
<path d="M80 6 C34 6 24 50 26 96 C28 130 22 160 16 180 C30 170 36 190 50 178 C60 194 70 176 80 190 C92 176 102 194 112 178 C124 190 132 170 144 180 C138 160 132 130 134 96 C136 50 126 6 80 6Z" fill="url(#gg)"/>
<path d="M30 160 C40 150 50 168 62 156 C74 168 86 150 98 162 C110 150 120 168 132 158" stroke="#ffffff" stroke-opacity=".5" stroke-width="3" fill="none"/>
<ellipse cx="58" cy="66" rx="14" ry="20" fill="#050505"/><ellipse cx="102" cy="66" rx="14" ry="20" fill="#050505"/>
<ellipse cx="80" cy="118" rx="16" ry="26" fill="#050505"/>
<ellipse cx="80" cy="124" rx="9" ry="14" fill="#1a0606"/>
</svg>`;
}

export function kuntilanakSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160">
<path d="M20 50 Q14 110 8 156 L92 156 Q86 110 80 50Z" fill="#ecebe6" opacity=".92"/>
<path d="M18 40 Q10 100 14 150 L30 150 Q26 90 34 56Z" fill="#070707"/><path d="M82 40 Q90 100 86 150 L70 150 Q74 90 66 56Z" fill="#070707"/>
<ellipse cx="50" cy="40" rx="20" ry="24" fill="#d9d6cf"/>
<path d="M28 44 Q24 6 50 8 Q76 6 72 44 Q68 22 62 20 L58 60 L50 30 L42 62 L38 20 Q32 22 28 44Z" fill="#050505"/>
<circle cx="45" cy="42" r="2.2" fill="#b30000"/><circle cx="56" cy="42" r="2.2" fill="#b30000"/>
<path d="M44 54 q6 4 12 0" stroke="#4a0000" stroke-width="2" fill="none"/>
</svg>`;
}

export function pocongSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160">
<path d="M50 4 L42 18 L58 18Z" fill="#f2f1ec"/><path d="M44 16 q6 5 12 0" stroke="#bdbab0" stroke-width="3" fill="none"/>
<path d="M30 30 Q26 20 50 18 Q74 20 70 30 Q80 80 74 150 Q50 160 26 150 Q20 80 30 30Z" fill="#f2f1ec"/>
<ellipse cx="50" cy="44" rx="15" ry="16" fill="#6e6a5e"/>
<ellipse cx="44" cy="42" rx="4" ry="5" fill="#0a0a0a"/><ellipse cx="56" cy="42" rx="4" ry="5" fill="#0a0a0a"/>
<path d="M30 70 h40 M28 110 h44 M30 146 h40" stroke="#bdbab0" stroke-width="3"/>
<path d="M50 150 L44 160 L56 160Z" fill="#f2f1ec"/>
</svg>`;
}

export function exclaimSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 60"><path d="M20 2 L38 52 L2 52Z" fill="#c4121f" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><rect x="17" y="16" width="6" height="20" rx="3" fill="#fff"/><circle cx="20" cy="44" r="3.6" fill="#fff"/></svg>`;
}

export function keySvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30"><circle cx="13" cy="15" r="10" fill="none" stroke="#e8b730" stroke-width="5"/><rect x="21" y="12" width="34" height="6" fill="#e8b730"/><rect x="42" y="16" width="5" height="9" fill="#e8b730"/><rect x="50" y="16" width="5" height="7" fill="#e8b730"/></svg>`;
}

export function batterySvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 50"><rect x="10" y="1" width="10" height="5" rx="1" fill="#9aa"/><rect x="3" y="5" width="24" height="43" rx="4" fill="#1d2b1d" stroke="#79e07a" stroke-width="3"/><rect x="8" y="12" width="14" height="9" fill="#79e07a"/><rect x="8" y="23" width="14" height="9" fill="#79e07a"/><rect x="8" y="34" width="14" height="9" fill="#79e07a"/></svg>`;
}

export function logoSvg(): string {
  const hunters = (["aisyah", "raka", "zahra", "nabila"] as CharId[])
    .map((id, i) => {
      const x = [70, 170, 270, 370][i];
      const y = i === 1 || i === 2 ? 288 : 300;
      const inner = characterSvg(id).replace(/<svg[^>]*>/, "").replace("</svg>", "");
      return `<g transform="translate(${x} ${y}) scale(0.95)">${inner}</g>`;
    })
    .join("");
  const ghost = ghostSvg().replace(/<svg[^>]*>/, "").replace("</svg>", "");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 460">
<defs><radialGradient id="moon" cx="80%" cy="15%" r="60%"><stop offset="0" stop-color="#4a1b3c"/><stop offset="1" stop-color="#07040a"/></radialGradient>
<linearGradient id="txt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff3b3b"/><stop offset="1" stop-color="#6d0008"/></linearGradient></defs>
<rect width="560" height="460" fill="url(#moon)"/>
<circle cx="450" cy="70" r="34" fill="#e9e2cf" opacity=".85"/>
<path d="M90 300 L90 150 L180 90 L270 150 L270 110 L300 110 L300 170 L380 120 L470 180 L470 300Z" fill="#120a14"/>
<path d="M170 300 L170 240 L210 240 L210 300Z" fill="#2a0b0e"/>
${[120, 230, 330, 420].map((x) => `<rect x="${x}" y="190" width="26" height="30" fill="#c9a23a" opacity=".35"/>`).join("")}
<g transform="translate(180 60) scale(1.25)" opacity=".92">${ghost}</g>
${hunters}
<rect y="400" width="560" height="60" fill="#000" opacity=".65"/>
<text x="280" y="48" text-anchor="middle" font-family="Creepster, 'Nosifer', fantasy" font-size="54" fill="url(#txt)" stroke="#000" stroke-width="2" letter-spacing="3">HANTU MALAM</text>
<text x="280" y="440" text-anchor="middle" font-family="'Special Elite', monospace" font-size="24" fill="#e7d9f3" letter-spacing="6">MABAR HOROR</text>
</svg>`;
}

export const svgUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function loadImg(svg: string): HTMLImageElement {
  const img = new Image();
  img.src = svgUrl(svg);
  return img;
}
