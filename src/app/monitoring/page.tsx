"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Activity, Cpu, HardDrive } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

export default function MonitoringPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [metrics, setMetrics] = useState({ cpuUsage: 0, ramUsagePercent: 0, ramTotalBytes: 0, ramUsedBytes: 0 });
  const { socket } = useSocket();

  useEffect(() => {
    fetch("/api/monitoring/server")
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setMetrics(d.data);
      });

    if (socket) {
      socket.on("server:metrics", (data: any) => {
        setMetrics(data);
      });
    }
  }, [socket]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Server & Bot Monitoring" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Cpu className="w-6 h-6 text-indigo-400" />
                <h3 className="font-bold text-white text-base">CPU Load Average</h3>
              </div>
              <p className="text-3xl font-extrabold text-white">{Number(metrics.cpuUsage || 0).toFixed(2)}%</p>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full transition-all" style={{ width: `${Math.min(Number(metrics.cpuUsage || 0) * 10, 100)}%` }} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <HardDrive className="w-6 h-6 text-emerald-400" />
                <h3 className="font-bold text-white text-base">RAM Usage Percentage</h3>
              </div>
              <p className="text-3xl font-extrabold text-white">{Number(metrics.ramUsagePercent || 0).toFixed(1)}%</p>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${metrics.ramUsagePercent || 0}%` }} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
