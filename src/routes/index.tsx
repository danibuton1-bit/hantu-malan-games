import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Art";
import { useApp } from "@/components/AppState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hantu Malam: Mabar Horor - Masuk" },
      { name: "description", content: "Daftar akun ID Card atau login pakai ID Card untuk main Hantu Malam bareng teman." },
      { property: "og:title", content: "Hantu Malam: Mabar Horor" },
      { property: "og:description", content: "Game horor multiplayer: cari 5 kunci dan kabur dari rumah tua sebelum hantu menangkapmu." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { ready, account } = useApp();
  const nav = useNavigate();
  const [splash, setSplash] = useState(true);
  useEffect(() => { const t = setTimeout(() => setSplash(false), 1800); return () => clearTimeout(t); }, []);
  useEffect(() => { if (!splash && ready && account) void nav({ to: "/home" }); }, [splash, ready, account, nav]);

  if (splash || !ready || account) {
    return (
      <main className="flex min-h-full flex-col items-center justify-center gap-6 px-6">
        <Logo className="w-full max-w-md animate-flicker rounded-xl" />
        <div className="h-1.5 w-48 overflow-hidden rounded bg-muted"><div className="h-full w-1/2 animate-pulse bg-blood" /></div>
        <p className="text-sm text-muted-foreground">Memanggil arwah...</p>
      </main>
    );
  }
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-6 px-6 py-10">
      <Logo className="w-full rounded-xl glow-blood" />
      <h1 className="font-horror text-drip text-center text-4xl text-primary">HANTU MALAM</h1>
      <p className="-mt-4 text-center text-sm text-muted-foreground">Tanpa email. Tanpa password. Cukup ID Card.</p>
      <Button asChild size="lg" className="h-16 w-full text-lg glow-blood"><Link to="/daftar">DAFTAR AKUN BARU</Link></Button>
      <Button asChild size="lg" variant="secondary" className="h-16 w-full text-lg"><Link to="/login">LOGIN PAKAI ID CARD</Link></Button>
    </main>
  );
}
