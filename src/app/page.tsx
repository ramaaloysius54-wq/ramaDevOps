"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  Users,
  MessageSquare,
  Send,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useSocket } from "@/hooks/useSocket";
import { formatCurrency } from "@/lib/utils";

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCustomers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalRevenue: 0,
    messagesIn: 0,
    messagesOut: 0,
    waStatus: "DISCONNECTED",
    phone: "-",
    uptimeStart: null,
  });

  const [chartData, setChartData] = useState<any[]>([
    { name: "Hari Ini", pesanMasuk: 0, pesanKeluar: 0, pesanan: 0, penjualan: 0 },
  ]);

  const { socket } = useSocket();

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      const d = await res.json();
      if (d.success && d.data) {
        setStats(d.data);
        if (Array.isArray(d.data.chartData) && d.data.chartData.length > 0) {
          setChartData(d.data.chartData);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    if (socket) {
      socket.on("dashboard:stats_update", () => {
        fetchStats();
      });

      socket.on("message:incoming", () => {
        fetchStats();
      });

      socket.on("message:outgoing", () => {
        fetchStats();
      });

      socket.on("whatsapp:status", (data: any) => {
        setStats((prev) => ({
          ...prev,
          waStatus: data.status,
          phone: data.phone || "-",
        }));
      });
    }
  }, [socket, fetchStats]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title="Dashboard Overview"
        />

        <main className="p-4 lg:p-8 space-y-6 lg:space-y-8 flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Customer</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats.totalCustomers.toLocaleString("id-ID")}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20"><Users className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pesan Masuk (In)</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats.messagesIn.toLocaleString("id-ID")}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-400 border border-purple-500/20"><MessageSquare className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pesan Terkirim (Out)</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats.messagesOut.toLocaleString("id-ID")}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"><Send className="w-5 h-5" /></div>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pesanan</p>
                  <h3 className="text-2xl font-bold text-white mt-1">{stats.totalOrders.toLocaleString("id-ID")}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20"><ShoppingBag className="w-5 h-5" /></div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span> Omzet (PAID):</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(stats.totalRevenue || 0)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 lg:p-6 backdrop-blur-md min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <div>
                  <h2 className="text-base font-bold text-white">Trafik Komunikasi (7 Hari)</h2>
                </div>
              </div>
              <div className="h-64 lg:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem" }} />
                    <Area type="monotone" dataKey="pesanMasuk" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIn)" name="Masuk" />
                    <Area type="monotone" dataKey="pesanKeluar" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorOut)" name="Keluar" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 lg:p-6 backdrop-blur-md flex flex-col justify-between min-w-0 overflow-hidden">
              <div>
                <h2 className="text-base font-bold text-white">Grafik Penjualan</h2>
              </div>
              <div className="h-48 lg:h-60 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "0.75rem" }} />
                    <Bar dataKey="pesanan" fill="#10b981" radius={[6, 6, 0, 0]} name="Order" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
