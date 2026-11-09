"use client";
import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { User } from "lucide-react";

export default function ProfilePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Profile Administrator" />
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-3xl mx-auto w-full">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
                A
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Rama Admin Enterprise</h3>
                <p className="text-xs text-slate-400">admin@ramastore.com • Super Admin</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
