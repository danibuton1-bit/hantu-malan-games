import { characterSvg, logoSvg, svgUrl, type CharId } from "@/lib/art";
import { cn } from "@/lib/utils";

export function CharImg({ id, className }: { id: CharId; className?: string }) {
  return <img src={svgUrl(characterSvg(id))} alt={id} className={cn("select-none", className)} draggable={false} />;
}

export function Logo({ className }: { className?: string }) {
  return <img src={svgUrl(logoSvg())} alt="Hantu Malam: Mabar Horor" className={cn("select-none", className)} draggable={false} />;
}
