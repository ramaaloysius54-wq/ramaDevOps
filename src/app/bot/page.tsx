"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Bot, Plus, Save } from "lucide-react";

export default function BotAutomationPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState<{ commands: any[]; keywords: any[]; config: any }>({ commands: [], keywords: [], config: null });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ keyword: "", response: "" });
  
  // State untuk form Pesan Otomatis (Fallback Message)
  const [fallbackMessage, setFallbackMessage] = useState("");
  const [savingFallback, setSavingFallback] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/bot/rules");
      const d = await res.json();
      if (d.success) {
        setData(d.data);
        if (d.data.config?.fallbackMessage) {
          setFallbackMessage(d.data.config.fallbackMessage);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/bot/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "keyword", ...form, isActive: true }),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ keyword: "", response: "" });
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFallback(true);
    setAlertMsg("");
    try {
      const res = await fetch("/api/bot/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "config", fallbackMessage }),
      });
      if (res.ok) {
        setAlertMsg("✅ Pesan otomatis (fallback) berhasil disimpan!");
      } else {
        setAlertMsg("❌ Gagal menyimpan pesan otomatis.");
      }
    } catch (e) {
      setAlertMsg("❌ Terjadi kesalahan jaringan.");
    }
    setSavingFallback(false);
    setTimeout(() => setAlertMsg(""), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Bot Automation & Auto-Reply" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">Aturan Keyword & Auto-Reply</h2>
              <p className="text-xs text-slate-400 mt-0.5">Kelola respons otomatis bot WhatsApp berdasarkan kata kunci pesan.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Tambah Keyword</span>
            </button>
          </div>

          {alertMsg && (
            <div className="p-3.5 bg-indigo-950/50 border border-indigo-800/50 text-indigo-300 rounded-xl text-xs font-medium">
              {alertMsg}
            </div>
          )}

          {/* Form Pengaturan Pesan Otomatis (Fallback Message) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-white text-sm">Pesan Otomatis (Fallback Message)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Pesan yang dikirimkan bot secara otomatis ketika perintah atau ketikan dari customer tidak dikenali.</p>
            </div>
            <form onSubmit={handleSaveFallback} className="space-y-4">
              <textarea
                rows={3}
                value={fallbackMessage}
                onChange={(e) => setFallbackMessage(e.target.value)}
                placeholder="Tulis pesan otomatis di sini..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingFallback}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingFallback ? "Menyimpan..." : "Simpan Pesan Otomatis"}</span>
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm">Daftar Keyword Custom</h3>
              <div className="space-y-3">
                {data.keywords.map((kw) => (
                  <div key={kw.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-mono text-xs font-bold text-indigo-400">Keyword: {kw.keyword}</span>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{kw.response}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-white text-sm">Command Utama Sistem</h3>
              <div className="space-y-3">
                {data.commands.map((cmd) => (
                  <div key={cmd.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                    <span className="font-mono text-xs font-bold text-emerald-400">{cmd.command}</span>
                    <p className="text-[10px] text-slate-500">{cmd.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
                <h3 className="text-lg font-bold text-white">Tambah Aturan Keyword</h3>
                <form onSubmit={handleAddKeyword} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Kata Kunci (Keyword)</label>
                    <input type="text" required placeholder="halo" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Pesan Balasan Bot</label>
                    <textarea required placeholder="Halo! Ada yang bisa dibantu?" value={form.response} onChange={(e) => setForm({ ...form, response: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1" rows={4} />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium">Batal</button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
