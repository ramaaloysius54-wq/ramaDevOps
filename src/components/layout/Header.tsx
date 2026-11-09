"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Menu, Bell, Wifi, WifiOff } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

interface HeaderProps {
  onToggleSidebar: () => void;
  title: string;
}

export function Header({ onToggleSidebar, title }: HeaderProps) {
  const { socket } = useSocket();
  const [waStatus, setWaStatus] = useState<string>("DISCONNECTED");
  const [waPhone, setWaPhone] = useState<string | null>(null);

  const checkLiveStatus = useCallback(() => {
    fetch("/api/whatsapp/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setWaStatus(d.data.status || "DISCONNECTED");
          setWaPhone(d.data.phone || null);
        }
      })
      .catch(() => {
        setWaStatus("DISCONNECTED");
      });
  }, []);

  useEffect(() => {
    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 8000);
    return () => clearInterval(interval);
  }, [checkLiveStatus]);

  useEffect(() => {
    if (socket) {
      socket.on("whatsapp:status", (data: { status: string; phone?: string | null }) => {
        setWaStatus(data.status);
        if (data.phone !== undefined) setWaPhone(data.phone);
      });
    }
  }, [socket]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONNECTED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "CONNECTING":
      case "RECONNECTING":
      case "PAIRING_CODE_READY":
      case "QR_READY":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "CONNECTED") {
      return waPhone ? `CONNECTED (+${waPhone})` : "CONNECTED";
    }
    if (status === "DISCONNECTED") {
      return "TIDAK TERHUBUNG";
    }
    return status;
  };

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Buka Navigasi"
          className="lg:hidden text-slate-300 hover:text-white p-2 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base sm:text-lg lg:text-xl font-bold text-white tracking-tight truncate">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${getStatusColor(
            waStatus
          )}`}
        >
          {waStatus === "CONNECTED" ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          )}
          <span className="hidden md:inline">WhatsApp:</span>
          <span className="font-semibold">{getStatusLabel(waStatus)}</span>
        </div>

        <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500" />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-800 pl-3 ml-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-slate-800">
            RS
          </div>
        </div>
      </div>
    </header>
  );
}
