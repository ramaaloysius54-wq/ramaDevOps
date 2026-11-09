"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useSocket } from "@/hooks/useSocket";

export default function AnalitikPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [data, setData] = useState({
    totalRevenue: 0,
    ordersCount: 0,
    customersCount: 0,
    topProducts: [],
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const { socket } = useSocket();

  const fetchAnalytics = useCallback(async () => {
    try {
      const [resAnalytics, resStats] = await Promise.all([
        fetch("/api/analytics/dashboard", { cache: "no-store" }),
        fetch("/api/dashboard/stats", { cache: "no-store" }),
      ]);
      const dA = await resAnalytics.json();
      const dS = await resStats.json();
      if (dA.success) setData(dA.data);
      if (dS.success && dS.data?.chartData) setChartData(dS.data.chartData);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    if (socket) {
      socket.on("dashboard:stats_update", fetchAnalytics);
    }
  }, [socket, fetchAnalytics]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title="Analitik Penjualan Real-Time"
        />
        <main className="p-4 lg:p-8 space-y-8 flex-1 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase">
                Total Penjualan (PAID)
              </p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-2">
                {formatCurrency(data.totalRevenue)}
              </h3>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase">
                Total Pesanan Masuk
              </p>
              <h3 className="text-2xl font-bold text-white mt-2">
                {data.ordersCount} Pesanan
              </h3>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <p className="text-xs font-semibold text-slate-400 uppercase">
                Total Customer
              </p>
              <h3 className="text-2xl font-bold text-white mt-2">
                {data.customersCount} Pelanggan
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-white text-base">
                Grafik Omzet Penjualan Harian (7 Hari Terakhir)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Menampilkan nilai penjualan Rp 0 jika belum ada transaksi berstatus PAID
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), "Penjualan"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="penjualan"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                    name="Penjualan (IDR)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="font-bold text-white text-base">
              Produk Terlaris (Top Sales)
            </h3>
            {data.topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Belum ada data penjualan produk.
              </p>
            ) : (
              <div className="space-y-3">
                {data.topProducts.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-4 bg-slate-950 border border-slate-800 rounded-xl"
                  >
                    <span className="font-semibold text-sm text-white">
                      {p.productName}
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      {p._sum.quantity} terjual ({formatCurrency(p._sum.subtotal || 0)})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
