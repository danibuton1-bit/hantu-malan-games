import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { useApp } from "@/components/AppState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginIdCard, parseQr } from "@/lib/account";
import { decodeQrFromFile } from "@/lib/idcard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login Pakai ID Card - Hantu Malam" },
      { name: "description", content: "Masuk ke Hantu Malam dengan upload foto ID Card atau ketik Kode ID dan nama." },
      { property: "og:title", content: "Login Pakai ID Card - Hantu Malam" },
      { property: "og:description", content: "Upload ID Card atau ketik Kode ID untuk masuk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function Login() {
  const { setAccount } = useApp();
  const nav = useNavigate();
  const [kode, setKode] = useState("HM-");
  const [nama, setNama] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function enter(k: string, n: string) {
    setBusy(true); setErr("");
    try {
      const p = await loginIdCard(k, n);
      if (!p) { setErr("ID Card tidak ditemukan. Cek lagi Kode ID dan nama."); return; }
      setAccount(p); void nav({ to: "/home" });
    } catch (e) { setErr(e instanceof Error ? e.message : "Gagal login"); }
    finally { setBusy(false); }
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    setBusy(true); setErr("");
    const txt = await decodeQrFromFile(f).catch(() => null);
    const q = txt ? parseQr(txt) : null;
    setBusy(false);
    if (!q) { setErr("QR Code di foto tidak terbaca. Coba foto yang lebih jelas atau ketik Kode ID."); return; }
    await enter(q.kode, q.username);
  }

  return (
    <main className="mx-auto min-h-full max-w-md space-y-6 px-5 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Kembali</Link>
      <h1 className="font-horror text-drip text-4xl text-primary">LOGIN ID CARD</h1>
      <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent bg-card text-center">
        <Upload className="size-8 text-primary" />
        <span>Upload foto / screenshot ID Card</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
      </label>
      <div className="text-center text-xs text-muted-foreground">atau ketik manual</div>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void enter(kode, nama); }}>
        <div className="space-y-2"><Label htmlFor="kode">Kode ID</Label><Input id="kode" value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} placeholder="HM-1234" className="h-12 tracking-widest" /></div>
        <div className="space-y-2"><Label htmlFor="nm">Nama</Label><Input id="nm" value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama di ID Card" className="h-12" /></div>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button type="submit" size="lg" className="h-14 w-full text-lg glow-blood" disabled={busy || !/^HM-\d{4}$/.test(kode) || !nama.trim()}>{busy ? "Mengecek..." : "MASUK"}</Button>
      </form>
    </main>
  );
}
