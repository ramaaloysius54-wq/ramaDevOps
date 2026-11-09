"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Save, UploadCloud, CreditCard, Loader2 } from "lucide-react";

export default function PaymentPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [gopay, setGopay] = useState("088227142563");
  const [qrisBase64, setQrisBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/payment")
      .then((res) => res.json())
      .then((d) => {
        if (d.success && d.data) {
          setGopay(d.data.gopay);
          setQrisBase64(d.data.qrisBase64);
        }
      });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrisBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gopay, qrisBase64 }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Metode Pembayaran (Payment)" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-3xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
              <CreditCard className="w-6 h-6 text-indigo-400" />
              <div>
                <h3 className="text-lg font-bold text-white">Konfigurasi Payment Bot</h3>
                <p className="text-xs text-slate-400">Atur nomor GoPay dan upload gambar QRIS yang akan dikirim bot.</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nomor GoPay / e-Wallet</label>
                <input type="text" required value={gopay} onChange={(e) => setGopay(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white mt-1" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">Upload Gambar QRIS (Otomatis dikirim bot)</label>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center relative">
                    {qrisBase64 ? (
                      <img src={qrisBase64} alt="QRIS" className="w-full h-full object-contain" />
                    ) : (
                      <UploadCloud className="w-8 h-8 text-slate-600" />
                    )}
                  </div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {saved && <span className="text-xs text-emerald-400 font-medium">Berhasil disimpan!</span>}
                <button type="submit" disabled={loading} className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
