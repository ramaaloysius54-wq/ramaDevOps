"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import {
  QrCode,
  Smartphone,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

export default function WhatsAppConnectionPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"qr" | "pairing">("qr");
  const [status, setStatus] = useState<string>("DISCONNECTED");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectedPhone, setConnectedPhone] = useState<string | null>(null);

  const { socket } = useSocket();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/status", { cache: "no-store" });
      const d = await res.json();
      if (d.success && d.data) {
        setStatus(d.data.status || "DISCONNECTED");
        setQrBase64(d.data.qrCode || null);
        setPairingCode(d.data.pairingCode || null);
        setConnectedPhone(d.data.phone || null);
      }
    } catch (e) {
      setStatus("DISCONNECTED");
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  useEffect(() => {
    if (socket) {
      socket.on("whatsapp:status", (data: any) => {
        setStatus(data.status);
        setConnectedPhone(data.phone || null);
        if (data.status === "DISCONNECTED") {
          setQrBase64(null);
          setPairingCode(null);
        }
      });

      socket.on("whatsapp:qr", (data: { qr: string }) => {
        setQrBase64(data.qr);
        setStatus("QR_READY");
      });

      socket.on("whatsapp:pairing-code", (data: { code: string }) => {
        setPairingCode(data.code);
        setStatus("PAIRING_CODE_READY");
      });
    }
  }, [socket]);

  const handleRequestPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Cegah klik berkali-kali
    setLoading(true);
    setPairingCode(null);

    try {
      const res = await fetch("/api/whatsapp/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message || "Gagal mendapatkan pairing code");
      if (d.pairingCode) {
        setPairingCode(d.pairingCode);
      } else {
        throw new Error("Kode pairing tidak diterima dari server.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Apakah Anda yakin ingin memutus koneksi WhatsApp?")) return;
    try {
      await fetch("/api/whatsapp/status", { method: "POST" });
      setStatus("DISCONNECTED");
      setQrBase64(null);
      setPairingCode(null);
      setConnectedPhone(null);
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title="Koneksi WhatsApp"
        />

        <main className="p-4 lg:p-8 space-y-6 max-w-5xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${
                  status === "CONNECTED"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                }`}
              >
                {status === "CONNECTED" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Status Sesi:{" "}
                  {status === "CONNECTED"
                    ? "CONNECTED (Terhubung)"
                    : status === "DISCONNECTED"
                    ? "DISCONNECTED (Tidak Terhubung)"
                    : status}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {status === "CONNECTED" && connectedPhone
                    ? `Terhubung stabil dengan akun: +${connectedPhone}`
                    : "Belum ada sesi WhatsApp yang terhubung."}
                </p>
              </div>
            </div>

            {status === "CONNECTED" && (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl text-sm font-semibold flex items-center gap-2 transition"
              >
                <PowerOff className="w-4 h-4" />
                <span>Log Out / Putuskan Sesi</span>
              </button>
            )}
          </div>

          {status !== "CONNECTED" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl mb-6 max-w-sm">
                <button
                  onClick={() => setActiveTab("qr")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    activeTab === "qr"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Scan QR Code</span>
                </button>
                <button
                  onClick={() => setActiveTab("pairing")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                    activeTab === "pairing"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pairing Code</span>
                </button>
              </div>

              {activeTab === "qr" && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
                  <div className="w-64 h-64 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-center shadow-inner relative">
                    {qrBase64 ? (
                      <img
                        src={qrBase64}
                        alt="WhatsApp Scan QR"
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-slate-500">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-xs">Menyiapkan QR Code...</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 max-w-md">
                    <h3 className="text-base font-bold text-white">
                      Petunjuk Scan QR Code:
                    </h3>
                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
                      <li>Buka aplikasi WhatsApp di ponsel Anda.</li>
                      <li>Ketuk ikon titik tiga (Android) atau Pengaturan (iOS).</li>
                      <li>
                        Pilih menu <b>Perangkat Tertaut</b> lalu klik{" "}
                        <b>Tautkan Perangkat</b>.
                      </li>
                      <li>Arahkan kamera ponsel Anda ke QR Code di layar ini.</li>
                    </ol>
                  </div>
                </div>
              )}

              {activeTab === "pairing" && (
                <div className="max-w-md mx-auto py-4 space-y-6">
                  <form onSubmit={handleRequestPairing} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 uppercase">
                        Nomor WhatsApp (Format Internasional)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 6288227142563"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Meminta Kode... (Mohon Tunggu)</span>
                        </>
                      ) : (
                        <span>Dapatkan Kode Pairing</span>
                      )}
                    </button>
                  </form>

                  {pairingCode && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-2">
                      <p className="text-xs text-slate-400">
                        Masukkan kode berikut pada notifikasi tautan perangkat Anda:
                      </p>
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-3xl font-mono font-bold tracking-widest text-indigo-400">
                          {pairingCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(pairingCode)}
                          className="p-2 text-slate-400 hover:text-white"
                        >
                          {copied ? (
                            <Check className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
