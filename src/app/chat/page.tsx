"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Send, Search, MessageSquare, ArrowLeft } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

export default function ChatManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const { socket } = useSocket();

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const d = await res.json();
      if (d.success) setConversations(d.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${convId}`);
      const d = await res.json();
      if (d.success) setMessages(d.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchConversations();
    if (socket) {
      socket.on("message:incoming", (data: any) => {
        fetchConversations();
        if (activeConv && activeConv.id === data.conversationId) {
          setMessages((prev) => [...prev, data.message]);
        }
      });
      socket.on("message:outgoing", (data: any) => {
        if (activeConv && activeConv.id === data.conversationId && data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
      });
    }
  }, [socket, activeConv]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv) return;
    const text = inputText;
    setInputText("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConv.id, text }),
      });
      const d = await res.json();
      if (d.success) {
        setMessages((prev) => [...prev, d.data]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col h-screen overflow-hidden min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Chat Management" />
        
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-2 lg:p-6 gap-4 lg:gap-6 min-w-0">
          
          {/* Daftar Chat (Sembunyikan di HP jika ada chat yang sedang dibuka) */}
          <div className={`w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-2xl flex-col overflow-hidden min-w-0 ${activeConv ? "hidden lg:flex" : "flex"}`}>
            <div className="p-4 border-b border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari customer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveConv(c);
                    fetchMessages(c.id);
                  }}
                  className={`p-4 cursor-pointer transition hover:bg-slate-800/50 ${
                    activeConv?.id === c.id ? "bg-slate-800/80 border-l-4 border-indigo-500" : ""
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm text-white truncate max-w-[150px]">{c.customer.name}</span>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">+{c.customer.phone}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Area Obrolan Chat */}
          <div className={`flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex-col overflow-hidden min-w-0 ${!activeConv ? "hidden lg:flex" : "flex"}`}>
            {activeConv ? (
              <>
                <div className="p-3 lg:p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <button onClick={() => setActiveConv(null)} className="lg:hidden p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:text-white transition">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold">
                      {activeConv.customer.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">{activeConv.customer.name}</h3>
                      <p className="text-[10px] lg:text-xs text-slate-400 truncate">+{activeConv.customer.phone}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] lg:text-[10px] px-2 py-1 rounded-full border whitespace-nowrap ${activeConv.isBotActive ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"}`}>
                    {activeConv.isBotActive ? "Bot Active" : "Live Agent"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/40">
                  {messages.map((m) => {
                    const isOut = m.senderType !== "CUSTOMER";
                    return (
                      <div key={m.id} className={`flex ${isOut ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] lg:max-w-md rounded-2xl px-3.5 py-2.5 text-sm ${isOut ? "bg-indigo-600 text-white rounded-br-none" : "bg-slate-800 text-slate-200 rounded-bl-none"}`}>
                          <p className="break-words whitespace-pre-wrap">{m.content}</p>
                          <span className={`text-[9px] block mt-1 text-right ${isOut ? "text-indigo-200" : "text-slate-400"}`}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSendMessage} className="p-3 lg:p-4 border-t border-slate-800 bg-slate-900 flex gap-2 lg:gap-3">
                  <input
                    type="text"
                    placeholder="Ketik balasan..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 min-w-0"
                  />
                  <button type="submit" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl flex items-center gap-2 transition flex-shrink-0">
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-2 p-6 text-center">
                <MessageSquare className="w-10 h-10 lg:w-12 lg:h-12 stroke-1 mb-2" />
                <p className="text-sm">Pilih percakapan di sebelah kiri untuk mulai membalas chat pelanggan.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
