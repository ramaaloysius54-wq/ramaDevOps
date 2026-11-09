"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ShoppingBag } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PesananPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const d = await res.json();
      if (d.success) setOrders(d.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) fetchOrders();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Manajemen Pesanan" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Daftar Transaksi Masuk</h2>
              <p className="text-xs text-slate-400 mt-0.5">Pesanan yang dibuat oleh customer melalui bot WhatsApp otomatis.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 uppercase font-mono text-[10px] text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-4">No. Order</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Total Tagihan</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Waktu</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-mono font-bold text-indigo-400">{o.orderNumber}</td>
                      <td className="p-4">
                        <p className="font-bold text-white">{o.customer.name}</p>
                        <p className="text-[10px] text-slate-500">+{o.customer.phone}</p>
                      </td>
                      <td className="p-4 font-bold text-white">{formatCurrency(o.totalAmount)}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${o.status === "PAID" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border border-amber-500/30"}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{formatDate(o.createdAt)}</td>
                      <td className="p-4 text-right space-x-2">
                        {o.status === "PENDING" && (
                          <button onClick={() => updateStatus(o.id, "PAID")} className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold transition">
                            Set PAID
                          </button>
                        )}
                        {o.status === "PAID" && (
                          <button onClick={() => updateStatus(o.id, "PROCESSING")} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold transition">
                            Proses
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
