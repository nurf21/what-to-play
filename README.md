# What to Play?

What to Play? membantu memilih game dari koleksi Steam dan Epic Games. Aplikasi ini memakai Next.js App Router, TypeScript, Tailwind CSS v4, dan komponen shadcn/ui berbasis Radix. UI berbahasa Inggris dengan tema gelap dan terang.

## Instalasi

Gunakan Node.js 22.12+ dari seri 22 atau Node.js 24 LTS, lalu jalankan:

```bash
npm ci
npm run dev
```

Buka [localhost:3000](http://localhost:3000). Untuk build produksi:

```bash
npm run build
npm start
```

Dashboard menampilkan empat game contoh dengan label **Demo library**. Impor yang berhasil atau penambahan game pertama akan mengganti contoh dan riwayat demonya dengan koleksi pribadi. Untuk memulai dari kosong, pilih **Settings → Clear demo**.

## Impor dan kelola koleksi

1. Siapkan CSV dari daftar judul di library Steam atau Epic Games Launcher. [Riwayat transaksi Epic](https://www.epicgames.com/help/c-32735058/c-31292734/a18163688) juga bisa menjadi referensi saat menyalin judul ke spreadsheet. Sertakan hanya produk yang ingin dimasukkan ke koleksi.
2. Buka **Import Library → CSV file** dan pilih file. Unduh template lewat dialog jika perlu. CSV harus memiliki kolom `title` dan `platform`, atau pilih **Default platform** jika seluruh baris tanpa platform berasal dari toko yang sama.
3. Pilih **Import games**. Ringkasan menampilkan game baru, duplikat yang cocok, dan baris yang dilewati. Buka **View CSV issues** untuk melihat penyebab baris dilewati.
4. Di **Game Library**, cari judul, urutkan berdasarkan penambahan, judul, atau waktu bermain, dan filter berdasarkan platform, genre, dan status. Buka kartu game untuk melihat detail, mengubah status, mengecualikan game dari picker, atau menghapusnya. Pilih **Add Game** untuk menambahkan judul secara manual.

```csv
title,platform,external_id,genres,status,cover_url,store_url,playtime_minutes
Hollow Knight,Steam,367520,Metroidvania|Action,Playing,,,90
Hades,Epic Games,,Roguelike|Action,Not Played,,https://store.epicgames.com/p/hades,
```

- Gunakan `Steam` atau `Epic Games` untuk platform. Alias `Epic` diterima. Status yang tersedia adalah `Not Played`, `Playing`, `Completed`, dan `Dropped`. Jika kosong, status awal `Not Played`.
- `external_id` adalah App ID numerik di Steam atau ID katalog untuk Epic. Steam App ID mengisi sampul dan tautan toko bila kolom tersebut kosong. Untuk Epic, isi URL produk dan sampul jika tersedia. URL yang diberikan harus menggunakan HTTPS.
- Pisahkan genre dengan `|`, `;`, atau koma. Kutip isi kolom dengan tanda petik ganda jika mengandung delimiter CSV. Parser menerima CSV UTF-8 dengan atau tanpa BOM, termasuk pemisah koma, titik koma, atau tab. Batasnya 5 MB dan 10.000 game per file.
- Impor berulang memakai ID pada platform yang sama, atau judul yang dinormalisasi bila ID tidak tersedia. Entri Steam dan Epic untuk judul yang sama tetap terpisah. Impor berulang mempertahankan status dan pengecualian yang sudah disimpan, memperbarui menit bermain jika tersedia, dan mengisi metadata yang masih kosong.

## Pemilihan acak

Buka **Random Picker**, tentukan platform, genre, dan status, lalu pilih **Roll the dice**. **Reroll** menjalankan undian lagi. Mode **No repeats** aktif secara default dan memulai putaran baru setelah semua game yang saat itu memenuhi filter terpilih. Setiap kombinasi filter memiliki putaran tersendiri. Game yang dikecualikan tidak masuk undian. Perubahan filter, putaran, tema, dan 250 pilihan terakhir bertahan setelah reload pada browser dan origin yang sama.

## Integrasi resmi

### Steam

Opsional, untuk instalasi lokal atau privat. Salin `.env.example` ke `.env.local` dan isi `STEAM_WEB_API_KEY` dengan [Steam Web API key](https://steamcommunity.com/dev/apikey) serta `STEAM_ACCOUNT_ID` dengan SteamID64 akun pribadi yang akan diimpor. Mulai ulang server, atur **Game Details** di Steam menjadi publik, lalu masukkan SteamID64 yang sama di **Import Library → Steam API**.

Route server menggunakan [IPlayerService/GetOwnedGames](https://partner.steamgames.com/doc/webapi/iplayerservice?language=english) melalui [host publik Steam Web API](https://partner.steamgames.com/doc/webapi_overview?language=english). Kunci tetap di server. Route dibatasi ke satu akun yang ditetapkan pada konfigurasi. Jika koleksinya privat atau API sedang bermasalah, gunakan CSV. Respons API mencakup judul dan waktu bermain jika tersedia. Game dengan waktu bermain di atas nol mulai sebagai `Playing`. Ubah status lewat detail game dan tambahkan genre dengan mengimpor CSV yang memuat judul atau App ID yang sama. Impor dijalankan saat diminta dan mempertahankan judul yang sudah tersimpan.

### Epic Games

Impor melalui CSV atau tambah manual. [Epic Online Services Ecom](https://dev.epicgames.com/docs/epic-games-store/services/ecom/ecom-overview?lang=en-US) mendokumentasikan verifikasi kepemilikan untuk produk dan konten dengan kebijakan klien developer. Dokumentasi tersebut tidak menyediakan API library konsumen lintas judul untuk aplikasi ini. Tidak diperlukan login Epic, token launcher, atau API privat.

## Arsitektur

| Lokasi | Peran |
| --- | --- |
| `src/app` | Next.js App Router, metadata, gaya global, dan route server Steam |
| `src/components` | Shell dashboard dan komponen antarmuka shadcn/ui |
| `src/features/library` | Model dan validasi game, pencarian, sorting, impor, deduplikasi, serta UI koleksi |
| `src/features/picker` | Pemilihan kandidat, putaran tanpa pengulangan, animasi, dan riwayat |
| `src/features/library/repository.ts` | Kontrak `LibraryRepository` dan adapter IndexedDB |

IndexedDB menyimpan koleksi, putaran picker, riwayat, dan preferensi. Perubahan dilakukan dalam transaksi baca-tulis, dan tab lain pada origin yang sama menerima pemberitahuan perubahan. File CSV dibaca di browser. Saat browser menghapus data situs, koleksi lokal ikut terhapus. Sampul HTTPS dapat dimuat dari host yang diberikan pada file CSV.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Unit test mencakup normalisasi, validasi, pencarian, filter, sorting, impor, deduplikasi, dan pemilihan acak.

## Pengembangan berikutnya

Tambahkan ekspor atau backup koleksi, pengayaan metadata melalui penyedia berlisensi, lalu adapter backend dan autentikasi jika sinkronisasi lintas perangkat diperlukan. Evaluasi integrasi Epic kembali jika tersedia API resmi dengan cakupan library konsumen.

Ilustrasi dadu dibuat untuk aplikasi ini. Empat sampul game demo berasal dari aset halaman toko Steam dan digunakan untuk mengidentifikasi game yang bersangkutan.
