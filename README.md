# Fess — Anonymous Messaging Platform

Fess adalah platform pesan anonim berbasis kelas/komunitas. Pengguna bisa mengirim pesan ke sebuah *base* secara anonim, admin base memoderasi pesan sebelum dipublikasikan, dan menghasilkan gambar siap posting untuk Instagram Stories maupun Feed.

---

## Fitur Utama

### Untuk Pengguna
- Kirim pesan anonim ke base yang diikuti
- Sertakan metadata opsional: tujuan (*Kepada*), identitas alias (*Dari*), kategori, dan musik
- Pilih lagu dari berbagai provider (YouTube Music, Spotify, Apple Music, Audius) dan tentukan potongan lagu yang ingin disertakan
- Ajukan *takedown* menggunakan Public ID jika pesan perlu diturunkan

### Untuk Admin Base
- Moderasi pesan masuk: setujui, tolak, atau tandai untuk ditinjau
- Edit metadata pesan sebelum disetujui
- Generate gambar otomatis dengan 5 preset desain editorial
- Bulk generate dan unduh gambar sebagai ZIP
- Kelola anggota, kategori, undangan, dan desain latar kustom
- Pantau permintaan takedown

### Platform
- Autentikasi terpusat via PinatAuth SSO
- Rate limiting berbasis HMAC — tidak menyimpan identitas pengirim
- Public ID unik setiap pesan yang disetujui untuk keperluan audit takedown
- Upload latar kustom dengan focal point editor dan crop otomatis untuk Story & Feed

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Backend | Laravel 11, PHP 8.3 |
| Frontend | React 19, TypeScript, Inertia.js |
| Styling | Tailwind CSS v4 (CSS-first tokens) |
| Database | PostgreSQL |
| Cache & Queue | Redis |
| Object Storage | S3-compatible (MinIO) |
| Image Rendering | PHP GD (server-side, tanpa headless browser) |
| Auth | PinatAuth SSO (OAuth2 + JWT) |
| Music Sidecar | ytmusicapi (Python, FastAPI) |

---

## Preset Desain

Generator gambar mendukung 5 preset dengan komposisi berbeda:

| Preset | Karakteristik |
|---|---|
| **Editorial Geometry** | Cincin besar yang keluar frame, zona konten tonal |
| **Typographic Poster** | Tipografi mendominasi kanvas, teks rata kiri-kanan |
| **Quiet Editorial** | Latar krem, garis vertikal aksen, ruang negatif intens |
| **Grid / Technical** | Dua kolom, metadata tersusun di sidebar kanan |
| **Bold Block** | Split warna atas/bawah, nama base besar di header |

Semua preset support format **Story (9:16)** dan **Feed Portrait (4:5)**, menggunakan tipografi adaptif berbasis pengukuran GD, dan tidak pernah memotong atau meregangkan background kustom.

---

## Arsitektur Sistem

```
Browser
  └── Inertia.js (React + TypeScript)
        └── Laravel 11
              ├── PinatAuth SSO          (autentikasi)
              ├── PostgreSQL             (data utama)
              ├── Redis                  (session, cache, queue)
              ├── S3-compatible Storage  (aset, latar kustom)
              ├── PHP GD Renderer        (generate gambar PNG)
              └── ytmusic sidecar        (search musik via YouTube Music)
```

---

## Keamanan & Privasi

- **Identitas pengirim tidak disimpan** — autentikasi hanya digunakan untuk rate limiting berbasis HMAC
- **Public ID** bersifat permanen dan tidak dapat dinonaktifkan — digunakan untuk keperluan takedown
- **Kode undangan** disimpan sebagai hash HMAC; raw code hanya ditampilkan sekali via flash session
- **Cross-base isolation** — tag, desain, dan submission divalidasi kepemilikannya setiap request
- Tidak ada field yang menerima URL atau path arbitrer dari klien

---

## Instalasi (Development)

**Prasyarat:** PHP 8.3, Composer, Node.js 20, PostgreSQL, Redis

```bash
# Clone & install
git clone <repo-url>
cd pinatmenfess
composer install
npm install

# Konfigurasi
cp .env.example .env
php artisan key:generate
# Edit .env: DB_*, REDIS_*, PINAT_AUTH_URL, AWS_*

# Setup database
php artisan migrate

# Jalankan
php artisan serve --port=8001
npm run dev
```

Untuk fitur pencarian musik, jalankan juga sidecar ytmusic:

```bash
cd services/ytmusic
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8765
```

---

## Deployment (Docker + Portainer)

Project ini siap deploy via Portainer menggunakan `docker-compose.yml` yang tersedia.

Stack terdiri dari:
- `pinatmenfess` — aplikasi utama (php artisan serve)
- `pinatmenfess-queue` — queue worker
- `ytmusic` — sidecar Python untuk search musik (internal, tidak diekspos)

Database dan Redis diasumsikan sudah berjalan secara eksternal.

Salin `.env.docker` sebagai referensi environment variables yang dibutuhkan, lalu isi nilainya di Portainer Stack → Environment variables.

---

## Lisensi

Private — hak cipta milik pemilik proyek.
