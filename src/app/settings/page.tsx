"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Settings, Save, Power, PhoneOff } from "lucide-react";

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [config, setConfig] = useState<any>({ 
    botName: "", 
    fallbackMessage: "", 
    outOfOfficeMessage: "",
    isEnabled: true,
    isAutoRejectCalls: true
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // PENAMBAHAN: Tambahkan cache: "no-store" agar browser tidak menampilkan data basi
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setConfig(d.data);
      });
  }, []);

  const handleToggle = async (field: string, value: boolean) => {
    setConfig({ ...config, [field]: value });
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="System Settings" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-3xl mx-auto w-full">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SAKELAR 1: BOT GLOBAL */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Power className={`w-4 h-4 ${config.isEnabled ? 'text-emerald-500' : 'text-red-500'}`} />
                  <h3 className="font-bold text-white text-sm">Status Bot</h3>
                </div>
                <p className="text-[10px] text-slate-400">Nyalakan/matikan bot untuk semua chat.</p>
              </div>
              <button 
                type="button"
                onClick={() => handleToggle('isEnabled', !config.isEnabled)}
                className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors duration-300 ${config.isEnabled ? 'bg-emerald-600' : 'bg-slate-700'}`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${config.isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* SAKELAR 2: AUTO REJECT PANGGILAN */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <PhoneOff className={`w-4 h-4 ${config.isAutoRejectCalls ? 'text-indigo-500' : 'text-slate-500'}`} />
                  <h3 className="font-bold text-white text-sm">Auto-Reject Panggilan</h3>
                </div>
                <p className="text-[10px] text-slate-400">Tolak otomatis panggilan WA masuk.</p>
              </div>
              <button 
                type="button"
                onClick={() => handleToggle('isAutoRejectCalls', !config.isAutoRejectCalls)}
                className={`w-10 h-5 rounded-full flex items-center p-1 transition-colors duration-300 ${config.isAutoRejectCalls ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300 ${config.isAutoRejectCalls ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Pengaturan Bot & Toko</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300">Nama Bot WhatsApp</label>
                <input type="text" value={config.botName || ""} onChange={(e) => setConfig({ ...config, botName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Pesan Fallback (Jika Perintah Tidak Dikenali)</label>
                <textarea value={config.fallbackMessage || ""} onChange={(e) => setConfig({ ...config, fallbackMessage: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white mt-1" rows={3} />
              </div>
              <div className="flex items-center justify-between pt-4">
                {saved && <span className="text-xs text-emerald-400 font-medium">Pengaturan berhasil disimpan!</span>}
                <button type="submit" className="ml-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
