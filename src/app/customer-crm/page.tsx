"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Users, BotOff, ShieldAlert, CheckCircle, Bot } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string;
  isBlocked: boolean;
  isBotActive: boolean;
}

export default function CustomerCRMPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const json = await res.json();
      if (json.success) setCustomers(json.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleToggle = async (phone: string, action: "block" | "bot", currentValue: boolean) => {
    // Optimistic UI Update biar terasa cepat di klik
    setCustomers(customers.map(c => 
      c.phone === phone 
        ? { ...c, [action === "block" ? "isBlocked" : "isBotActive"]: !currentValue }
        : c
    ));

    try {
      await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action, value: !currentValue }),
      });
    } catch (e) {
      // Revert jika gagal
      fetchCustomers();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Customer CRM & Kontak" />
        
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" /> Daftar Kontak WhatsApp
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Atur siapa saja yang bisa mengakses bot otomatis atau blokir nomor spam.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nama & Nomor</th>
                    <th className="px-6 py-4 font-semibold text-center">Status Auto-Reply (Bot)</th>
                    <th className="px-6 py-4 font-semibold text-center">Status Keamanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-500">Memuat data kontak...</td></tr>
                  ) : customers.length === 0 ? (
                    <tr><td colSpan={3} className="text-center py-8 text-slate-500">Belum ada kontak yang chat ke bot.</td></tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-sm">{c.name}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">+{c.phone}</div>
                        </td>
                        
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggle(c.phone, "bot", c.isBotActive)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              c.isBotActive 
                                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20" 
                                : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {c.isBotActive ? <Bot className="w-3.5 h-3.5" /> : <BotOff className="w-3.5 h-3.5" />}
                            {c.isBotActive ? "Bot Nyala" : "Bot Mati"}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggle(c.phone, "block", c.isBlocked)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              c.isBlocked 
                                ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20" 
                                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            }`}
                          >
                            {c.isBlocked ? <ShieldAlert className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            {c.isBlocked ? "Diblokir" : "Aman"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
