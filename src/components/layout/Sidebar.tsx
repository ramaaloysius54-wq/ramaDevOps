"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, QrCode, MessageSquare, Package, ShoppingBag, Users, Bot, BarChart3, Activity, User, Settings, LogOut, X, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps { isOpen: boolean; onClose: () => void; }

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/whatsapp", label: "WhatsApp Connect", icon: QrCode },
  { href: "/chat", label: "Chat Management", icon: MessageSquare },
  { href: "/katalog", label: "Katalog & Menu Bot", icon: Package },
  { href: "/pesanan", label: "Pesanan", icon: ShoppingBag },
  { href: "/payment", label: "Payment", icon: CreditCard },
  { href: "/customer", label: "Customer CRM", icon: Users },
  { href: "/bot", label: "Bot Automation", icon: Bot },
  { href: "/analitik", label: "Analitik", icon: BarChart3 },
  { href: "/monitoring", label: "Server Monitor", icon: Activity },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {isOpen && <div onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity" />}
      <aside className={cn("fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none", isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">RS</div>
            <div>
              <span className="text-base font-bold text-white tracking-wide block">Rama Store</span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-widest uppercase block">Management</span>
            </div>
          </Link>
          <button onClick={onClose} aria-label="Tutup Menu" className="lg:hidden text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => { if (typeof window !== "undefined" && window.innerWidth < 1024) onClose(); }} className={cn("flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group", isActive ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60")}>
                <Icon className={cn("w-5 h-5 transition-transform duration-200 group-hover:scale-110", isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-3 mt-3 border-t border-slate-800/80">
            <button onClick={handleLogout} disabled={loggingOut} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-white hover:bg-rose-600/20 border border-transparent hover:border-rose-500/30 transition-all group">
              <LogOut className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 text-rose-400" />
              <span>{loggingOut ? "Keluar..." : "Logout / Keluar"}</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
