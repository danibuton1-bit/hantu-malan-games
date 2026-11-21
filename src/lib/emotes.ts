export const EMOTES = [
  { id: "wave", icon: "👋", label: "Halo" },
  { id: "laugh", icon: "😂", label: "Ngakak" },
  { id: "scared", icon: "😱", label: "Takut" },
  { id: "dance", icon: "🕺", label: "Joget" },
  { id: "ghost", icon: "👻", label: "Boo!" },
  { id: "pray", icon: "🙏", label: "Tolong" },
] as const;
export type EmoteId = (typeof EMOTES)[number]["id"];
export const emoteIcon = (id: string) => EMOTES.find((e) => e.id === id)?.icon ?? "❓";
