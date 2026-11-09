"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Users, Bot, BotOff, ShieldAlert, CheckCircle, Edit, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { io } from "socket.io-client";

export default function CustomerPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  // State Modal Tambah
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", phone: "" });

  // State Modal Edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ oldPhone: "", newName: "", newPhone: "" });
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = () => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((d) => { if (d.success) setCustomers(d.data); })
      .catch((e) => console.error(e));
  };

  useEffect(() => {
    fetchCustomers();
    const socket = io("http://localhost:4000");
    socket.on("message:incoming", () => fetchCustomers());
    socket.on("dashboard:stats_update", () => fetchCustomers());
    return () => { socket.disconnect(); };
  }, []);

  const handleToggle = async (phone: string, action: "block" | "bot", currentValue: boolean) => {
    setCustomers(customers.map(c => 
      c.phone === phone ? { ...c, [action === "block" ? "isBlocked" : "isBotActive"]: !currentValue } : c
    ));
    try {
      await fetch("/api/customers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action, value: !currentValue }),
      });
    } catch (e) { fetchCustomers(); }
  };

  const openEditModal = (customer: any) => {
    setEditForm({ oldPhone: customer.phone, newName: customer.name, newPhone: customer.phone });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", oldPhone: editForm.oldPhone, newName: editForm.newName, newPhone: editForm.newPhone }),
      });
      if (res.ok) { setShowEditModal(false); fetchCustomers(); }
    } catch (error) {}
    setIsSaving(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddForm({ name: "", phone: "" });
        fetchCustomers();
      } else {
        alert("Gagal menyimpan, mungkin nomor sudah ada.");
      }
    } catch (error) {}
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Customer CRM" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" /> Database CRM
              </h2>
              <p className="text-xs text-slate-400 mt-1">Data pelanggan disimpan manual untuk menghindari riwayat chat spam.</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)} 
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Tambah Data
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 uppercase font-mono text-[10px] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">Nama</th>
                    <th className="p-4">Nomor WhatsApp</th>
                    <th className="p-4">Total Chat</th>
                    <th className="p-4">Total Order</th>
                    <th className="p-4">Bergabung</th>
                    <th className="p-4 text-center">Status Bot</th>
                    <th className="p-4 text-center">Keamanan</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 text-sm">
                        Belum ada pelanggan. Silakan klik Tambah Data.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition group">
                        <td className="p-4 font-bold text-white">{c.name}</td>
                        <td className="p-4 font-mono text-indigo-400">+{c.phone}</td>
                        <td className="p-4">{c._count?.conversations || 0} sesi</td>
                        <td className="p-4">{c._count?.orders || 0} pesanan</td>
                        <td className="p-4 text-slate-500">{formatDate(c.createdAt)}</td>
                        
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggle(c.phone, "bot", c.isBotActive)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                              c.isBotActive ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                            }`}
                          >
                            {c.isBotActive ? <Bot className="w-3 h-3" /> : <BotOff className="w-3 h-3" />}
                            {c.isBotActive ? "Nyala" : "Mati"}
                          </button>
                        </td>

                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggle(c.phone, "block", c.isBlocked)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold transition-all ${
                              c.isBlocked ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {c.isBlocked ? <ShieldAlert className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                            {c.isBlocked ? "Diblokir" : "Aman"}
                          </button>
                        </td>
                        
                        <td className="p-4 text-center">
                          <button onClick={() => openEditModal(c)} className="p-1.5 bg-slate-800 text-slate-400 rounded hover:bg-indigo-600 hover:text-white transition">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MODAL TAMBAH DATA */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
                <h3 className="text-lg font-bold text-white">Tambah Pelanggan Baru</h3>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Nama Pelanggan</label>
                    <input type="text" required value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Nomor WhatsApp</label>
                    <input type="text" required placeholder="62812345678" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Batal</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">{isSaving ? "Menyimpan..." : "Simpan"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL EDIT DATA */}
          {showEditModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
                <h3 className="text-lg font-bold text-white">Edit Data Pelanggan</h3>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Nama Pelanggan</label>
                    <input type="text" required value={editForm.newName} onChange={(e) => setEditForm({ ...editForm, newName: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Nomor WhatsApp</label>
                    <input type="text" required value={editForm.newPhone} onChange={(e) => setEditForm({ ...editForm, newPhone: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white mt-1" />
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs">Batal</button>
                    <button type="submit" disabled={isSaving} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs">{isSaving ? "Menyimpan..." : "Simpan"}</button>
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
