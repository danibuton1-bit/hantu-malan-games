import { useMemo } from "react";
import { Crown, Hand, Heart, HeartHandshake, Laugh, Music, ShieldAlert, Trophy } from "lucide-react";
import { characterSvg, logoSvg, svgUrl, type CharId } from "@/lib/art";
import { cn } from "@/lib/utils";

/** Inline SVG so eyes can blink and limbs can play emote animations. */
export function CharImg({ id, className, emote, style }: { id: CharId; className?: string; emote?: string | null; style?: React.CSSProperties }) {
  const html = useMemo(() => characterSvg(id).replace("<svg ", '<svg style="height:100%;width:auto;display:block;overflow:visible" '), [id]);
  const delay = useMemo(() => `${-(Math.random() * 4).toFixed(2)}s`, []);
  return (
    <div className={cn("hm-char relative inline-block select-none", emote && `hm-emote-${emote}`, className)} style={{ ...style, ["--blink-delay" as string]: delay }} role="img" aria-label={id}>
      <div className="h-full" dangerouslySetInnerHTML={{ __html: html }} />
      {emote === "kiss" && <div className="hm-hearts pointer-events-none absolute inset-x-0 top-0">{[0, 1, 2].map((i) => <Heart key={i} className="absolute fill-primary text-primary" style={{ left: `${45 + i * 12}%`, animationDelay: `${i * 0.3}s` }} />)}</div>}
      {emote === "hug" && <div className="hm-hearts pointer-events-none absolute inset-x-0 top-0"><HeartHandshake className="absolute left-1/2 size-8 -translate-x-1/2 text-primary" /></div>}
    </div>
  );
}

export function EmoteIcon({ id, className }: { id: string; className?: string }) {
  const I = { wave: Hand, dance: Music, laugh: Laugh, salute: Crown, victory: Trophy, scared: ShieldAlert, hug: HeartHandshake, kiss: Heart }[id] ?? Hand;
  return <I className={className} />;
}

export function Logo({ className }: { className?: string }) {
  return <img src={svgUrl(logoSvg())} alt="Hantu Malam: Mabar Horor" className={cn("select-none", className)} draggable={false} />;
}
