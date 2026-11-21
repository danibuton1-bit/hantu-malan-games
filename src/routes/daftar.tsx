import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { CharImg } from "@/components/Art";
import { useApp } from "@/components/AppState";
import { IdCardView } from "@/components/IdCardView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProfile, type Profile } from "@/lib/account";
import { CHAR_IDS, CHARACTERS, type CharId } from "@/lib/art";

export const Route = createFileRoute("/daftar")({
  head: () => ({
    meta: [
      { title: "Daftar Akun ID Card - Hantu Malam" },
      { name: "description", content: "Buat akun Hantu Malam cukup dengan nama dan tanggal lahir, dapatkan ID Card resmi." },
      { property: "og:title", content: "Daftar Akun ID Card - Hantu Malam" },
      { property: "og:description", content: "Buat akun dan dapatkan ID Card resmi Hantu Malam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Daftar,
});

function Daftar() {
  const { setAccount } = useApp();
  const nav = useNavigate();
  const [step, setStep] = useState<"form" | "char" | "card">("form");
  const [nama, setNama] = useState("");
  const [tgl, setTgl] = useState("");
  const [char, setChar] = useState<CharId>("raka");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  async function generate() {
    setBusy(true); setErr("");
    try {
      const p = await createProfile(nama.trim(), tgl, char);
      setProfile(p); setAccount(p); setStep("card");
    } catch (e) { setErr(e instanceof Error ? e.message : "Gagal membuat akun"); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto min-h-full max-w-md px-5 py-6">
      {step !== "card" && <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" /> Kembali</Link>}
      {step === "form" && (
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); if (nama.trim().length >= 2 && tgl) setStep("char"); }}>
          <h1 className="font-horror text-drip text-4xl text-primary">DAFTAR AKUN</h1>
          <div className="space-y-2"><Label htmlFor="nama">Nama</Label><Input id="nama" value={nama} maxLength={30} onChange={(e) => setNama(e.target.value)} placeholder="Nama kamu" className="h-12" /></div>
          <div className="space-y-2"><Label htmlFor="tgl">Tanggal Lahir</Label><Input id="tgl" type="date" value={tgl} max="2024-12-31" onChange={(e) => setTgl(e.target.value)} className="h-12" /></div>
          <Button type="submit" size="lg" className="h-14 w-full text-lg glow-blood" disabled={nama.trim().length < 2 || !tgl}>GENERATE AKUN</Button>
        </form>
      )}
      {step === "char" && (
        <div className="space-y-4">
          <h1 className="font-horror text-drip text-3xl text-primary">PILIH PEMBURUMU</h1>
          <div className="grid grid-cols-2 gap-3">
            {CHAR_IDS.map((id) => (
              <button key={id} onClick={() => setChar(id)}
                className={`rounded-xl border-2 bg-card p-3 text-left transition ${char === id ? "border-primary glow-blood" : "border-border"}`}>
                <CharImg id={id} className="mx-auto h-32" />
                <div className="font-horror mt-2 text-xl">{CHARACTERS[id].nama}</div>
                <div className="text-xs text-muted-foreground">{CHARACTERS[id].desc}</div>
              </button>
            ))}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button size="lg" className="h-14 w-full text-lg" disabled={busy} onClick={generate}>{busy ? "Membuat ID Card..." : "BUAT ID CARD"}</Button>
        </div>
      )}
      {step === "card" && profile && (
        <div className="space-y-4">
          <h1 className="font-horror text-drip text-center text-3xl text-primary">ID CARD KAMU SIAP</h1>
          <IdCardView profile={profile} />
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            Username: <b>{profile.username}</b><br />Kode ID: <b className="text-primary">{profile.kode_id}</b>
            <p className="mt-1 text-xs text-muted-foreground">Simpan atau screenshot ID Card ini. Kamu butuh ini untuk login di HP lain.</p>
          </div>
          <Button size="lg" className="h-14 w-full text-lg glow-blood" onClick={() => void nav({ to: "/home" })}>MASUK KE GAME</Button>
        </div>
      )}
    </main>
  );
}
