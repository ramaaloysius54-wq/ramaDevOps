# 🌟 Rama Store WA Platform - Full-Stack DevOps Project

## 🚀 Project Overview
**Rama Store WA Platform** adalah sistem otomatisasi bot WhatsApp berbasis Next.js yang dikembangkan khusus untuk melayani transaksi produk digital secara *real-time* 24/7. Proyek ini tidak hanya berfokus pada antarmuka pengguna (UI/UX) dan sistem backend, tetapi juga mendemonstrasikan penguasaan arsitektur server tingkat lanjut (DevOps) dengan mendeploy aplikasi ke dalam lingkungan NAT VPS yang memiliki batasan port publik ketat.

## 🏗️ Architecture & Tech Stack

### 💻 Application Layer
- **Frontend & API:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **WhatsApp Engine:** `@whiskeysockets/baileys` (Custom Implementation)
- **Database & ORM:** PostgreSQL dengan Prisma ORM
- **Real-time Engine:** Socket.IO untuk pembaruan status QR dan pesan secara instan

### ⚙️ Infrastructure & DevOps Layer
- **Server:** NAT VPS (Hypercloud) berarsitektur Linux Debian/Ubuntu
- **Process Manager:** PM2 (Menjalankan dual-process: Web Dashboard dan Bot Engine)
- **Web Server & Routing:** Nginx (Reverse Proxy)
- **Tunnels & Networking:** Custom Port Forwarding NAT VPS & Cloudflare Tunnel
- **CI/CD Pipeline:** GitHub Actions

---

## 💡 Technical Highlights & Problem Solving

### 1. Zero-Downtime CI/CD Pipeline via GitHub Actions
Membangun otomatisasi *Continuous Integration & Continuous Deployment* (CI/CD) yang terhubung langsung ke server produksi. 
- **Mekanisme:** Setiap kali kode di-push ke branch `main`, GitHub Actions (*runner*) akan masuk ke NAT VPS melalui port SSH khusus.
- **Eksekusi:** Sistem otomatis melakukan `git pull`, memperbarui dependensi, melakukan kompilasi (`npm run build`), dan me-restart mesin PM2 (Web & Bot) secara sekuensial tanpa mematikan layanan aplikasi.

### 2. Overcoming NAT VPS Networking Constraints
NAT VPS secara bawaan memblokir akses masuk dari port standar web (80/443). Saya merancang arsitektur jaringan internal untuk menembus batasan ini dengan cara:
- Mengonfigurasi **Nginx** sebagai *Reverse Proxy* di port lokal (80) untuk meneruskan lalu lintas (*proxy_pass*) ke port 3000 (Next.js) dan mendukung *WebSocket* (`Upgrade $http_upgrade`).
- Memanfaatkan fitur *Domain/Port Forwarding* bawaan dari panel Virtualizor/Hypercloud untuk mengekspos port 80 Nginx ke internet publik.
- Mengintegrasikan **Cloudflare Tunnel (Zero Trust)** sebagai jalur distribusi alternatif yang aman (HTTPS) langsung menuju *localhost:3000*, mengabaikan limitasi IP Publik dari penyedia server.

### 3. Dual-Process Architecture for Stability
Alih-alih menyatukan seluruh logika ke dalam satu *thread*, sistem dipecah menjadi dua proses mandiri yang dikawal oleh PM2:
1. `ramabot`: Melayani *HTTP Requests* untuk Dashboard Web (Port 3000).
2. `rama-engine`: Menjalankan daemon *WebSocket* Baileys (Port 4000) untuk menjaga sesi koneksi WhatsApp tetap hidup (24/7).
Arsitektur ini memastikan bahwa jika proses *build* web Next.js memakan memori tinggi, mesin *auto-reply* WhatsApp tidak ikut *crash* atau terputus.

### 4. Advanced TypeScript & Memory Management
Menyelesaikan isu *Type Error* pada implementasi modul `msgRetryCounterCache` dari Baileys dengan menerapkan *Type Casting* (`as number | undefined`). Selain itu, membangun fungsi *RAM caching* kustom (`messageCache.set`) dengan mekanisme pembersihan otomatis (`setTimeout`) untuk menyimpan *history* pesan secara temporer, sehingga mencegah *bug* "Menunggu pesan ini" pada perangkat pengguna tanpa membebani penyimpanan database.

---

## 📸 Key Outcomes
- **100% Automasi Deployment:** Mengurangi waktu *deploy* dari manual (15 menit) menjadi otomatis (di bawah 3 menit).
- **High Availability:** Bot mampu merespons otomatis permintaan katalog, pembayaran, dan status order secara konstan tanpa intervensi manusia.
- **Resource Efficiency:** Berhasil menekan penggunaan memori dan CPU server melalui arsitektur multi-proses dan manajemen memori Node.js yang ketat di server VPS berspesifikasi rendah.
