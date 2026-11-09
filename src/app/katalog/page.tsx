"use client";
import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Package, Plus, Trash2, MessageCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function KatalogPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"checkout" | "menubot">("checkout");

  const [products, setProducts] = useState<any[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ sku: "", name: "", description: "", price: "", stock: "", category: "APLIKASI_PREMIUM" });

  const [menus, setMenus] = useState<any[]>([]);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({ id: "", keyword: "", response: "" });

  const fetchData = async () => {
    try {
      const [resProd, resMenu] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/menu-produk")
      ]);
      const dProd = await resProd.json();
      const dMenu = await resMenu.json();
      if (dProd.success) setProducts(dProd.data);
      if (dMenu.success) setMenus(dMenu.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...productForm, isActive: true }),
    });
    setShowProductModal(false);
    setProductForm({ sku: "", name: "", description: "", price: "", stock: "", category: "APLIKASI_PREMIUM" });
    fetchData();
  };

  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/menu-produk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuForm),
    });
    setShowMenuModal(false);
    setMenuForm({ id: "", keyword: "", response: "" });
    fetchData();
  };

  const handleMenuDelete = async (id: string) => {
    if (!confirm("Hapus menu ini dari daftar bot?")) return;
    await fetch(`/api/menu-produk?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} title="Katalog & Menu Bot" />
        
        <main className="p-4 lg:p-8 space-y-6 flex-1 max-w-7xl mx-auto w-full min-w-0">
          
          <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
            <button
              onClick={() => setActiveTab("checkout")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === "checkout" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Sistem Produk & Order</span>
            </button>
            <button
              onClick={() => setActiveTab("menubot")}
              className={`flex-1 py-2.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeTab === "menubot" ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Konten Menu Bot</span>
            </button>
          </div>

          {activeTab === "checkout" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Daftar Produk Checkout</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Produk yang dapat diorder pelanggan dengan format ORDER#SKU.</p>
                </div>
                <button onClick={() => setShowProductModal(true)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                  <Plus className="w-4 h-4" />
                  <span>Tambah Produk</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => (
                  <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                          {p.sku}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400">Stok: {p.stock}</span>
                      </div>
                      <h3 className="font-bold text-white text-base">{p.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-extrabold text-indigo-400">{formatCurrency(p.price)}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg truncate max-w-[100px]">{p.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "menubot" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">Konten & List Menu Bot</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Daftar ini akan otomatis tampil menyatu saat pelanggan mengetik !premium</p>
                </div>
                <button onClick={() => { setMenuForm({ id: "", keyword: "", response: "" }); setShowMenuModal(true); }} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20">
                  <Plus className="w-4 h-4" />
                  <span>Tambah Menu Layanan</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menus.map((m) => (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative group hover:border-slate-700 transition">
                    <h3 className="font-bold text-indigo-400 font-mono mb-2">𐚁๋࣭⭑ {m.keyword}</h3>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-4">{m.response}</p>
                    <div className="absolute top-4 right-4 flex gap-2 lg:opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => { setMenuForm(m); setShowMenuModal(true); }} className="text-xs bg-slate-800 px-2.5 py-1.5 rounded-lg text-white font-medium hover:bg-slate-700">Edit</button>
                      <button onClick={() => handleMenuDelete(m.id)} className="text-xs bg-rose-600/20 text-rose-400 px-2.5 py-1.5 rounded-lg hover:bg-rose-600/40"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Input Produk Checkout */}
          {showProductModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-white">Tambah Produk Checkout</h3>
                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">SKU Produk (Untuk dipanggil di Order)</label>
                    <input type="text" required placeholder="APP-SPOT-02" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-mono text-white mt-1 uppercase focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Nama Produk</label>
                    <input type="text" required placeholder="Spotify Premium 3 Bulan" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Deskripsi Singkat</label>
                    <textarea required placeholder="Deskripsi layanan..." value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300">Harga (IDR)</label>
                      <input type="number" required placeholder="50000" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300">Stok</label>
                      <input type="number" required placeholder="100" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Kategori</label>
                    <select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 focus:outline-none focus:border-indigo-500">
                      <option value="APLIKASI_PREMIUM">Aplikasi Premium</option>
                      <option value="JASA_WEBSITE">Jasa Website</option>
                      <option value="JASA_BOT_WA">Jasa Bot WhatsApp</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                    <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-700">Batal</button>
                    <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-500">Simpan</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Input Konten Menu Bot */}
          {showMenuModal && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-white">{menuForm.id ? "Edit Konten Bot" : "Tambah Konten Menu Bot"}</h3>
                <form onSubmit={handleMenuSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Nama Aplikasi / Layanan (Contoh: CAPCUT)</label>
                    <input type="text" required value={menuForm.keyword} onChange={(e) => setMenuForm({ ...menuForm, keyword: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 uppercase font-mono focus:outline-none focus:border-indigo-500" placeholder="CAPCUT" />
                    <p className="text-[10px] text-slate-500 mt-1">Ini akan otomatis masuk ke List Menu saat user ketik !premium</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300">Deskripsi Lengkap & Harga</label>
                    <textarea required rows={8} value={menuForm.response} onChange={(e) => setMenuForm({ ...menuForm, response: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white mt-1 font-mono focus:outline-none focus:border-indigo-500" placeholder="🤖CAPCUT📦\n> Baca note kalo ga paham!\n\n🏷️ 30 DAY FULLGAR:\n- Private — 17k\n\n💳 Ketik payment untuk info pembayaran" />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button type="button" onClick={() => setShowMenuModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-700">Batal</button>
                    <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-500">Simpan Menu</button>
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
