# 📝 Jurnal Mengajar Digital (wwn-jurnal-80)

Sistem Digital Jurnal Mengajar untuk madrasah/sekolah — sejenis aplikasi jurnal lama, tetapi lebih lengkap,
user-friendly, dan responsif untuk laptop maupun HP.

**Stack:** React 19 + Vite + TypeScript + Tailwind CSS 4 (frontend) • Google Spreadsheet + Google Apps Script (backend/database) • Vercel (hosting)

## Fitur

| Menu | Isi |
|---|---|
| 🏠 Beranda | Statistik (jurnal hari ini/bulan ini, guru & siswa aktif), daftar jurnal terbaru, jam live |
| ✏️ Isi Jurnal | Form jurnal: tanggal, guru, mapel, kelas → daftar siswa otomatis, materi, tujuan, absensi H/S/I/A per siswa (+ tombol "Semua Hadir"), catatan guru. Validasi form. |
| 📖 Data Jurnal | Filter rentang tanggal, guru, mapel, kelas + pencarian teks. Lihat detail, edit, hapus (dengan konfirmasi). |
| 🖨️ Laporan | Rekap siap cetak/PDF + unduh Excel (CSV), lengkap dengan tanda tangan kepala madrasah. |
| 📊 Rekap | Rekap absensi per siswa per bulan (% kehadiran) + rekap jurnal per guru per bulan. |
| 🎓 Rubrik Penilaian | Nilai per kelas+mapel: PH 1–10, PTS, PAS, KTR, Sikap → Nilai Akhir otomatis (bobot bisa diatur). Simpan & unduh Excel. |
| 👥 Kelola Data | CRUD Guru, Mata Pelajaran, Kelas, Siswa (dengan konfirmasi hapus; kelas berisi siswa tidak bisa dihapus). |
| ⚙️ Pengaturan | Identitas sekolah + bobot penilaian (total harus 100%). |
| 🔌 Konfigurasi | Status koneksi, URL backend, uji koneksi, inisialisasi 7 sheet, ganti sekolah. |

**Multi-sekolah:** daftar sekolah di `public/schools.json` (satu alamat untuk banyak sekolah, pola sama seperti wwn-bel-80).
Ganti sekolah lewat nama sekolah di header. Parameter URL `?school=id` memilih sekolah langsung.

**Tanpa login** — sesuai permintaan pemilik, aplikasi ini untuk kalangan sendiri.

## Struktur database (7 sheet)

`Pengaturan` • `Guru` • `Mapel` • `Kelas` • `Siswa` • `Jurnal` (absensi tersimpan sebagai JSON) • `Penilaian`

## Setup backend (sekali per sekolah)

1. Buat Google Spreadsheet baru (mis. "Database Jurnal Mengajar").
2. Buka **Extensions → Apps Script**, **hapus seluruh isi editor**, lalu paste seluruh isi `backend/Kode.gs`.
3. **Deploy → New deployment → Web app**: *Execute as:* Me, *Who has access:* Anyone. Salin URL `/exec`.
4. Buka aplikasi → menu **Konfigurasi** → tempel URL → **Simpan URL** → **Uji Koneksi** → **Inisialisasi 7 Sheet**.
5. Isi data awal di **Kelola Data** (guru, mapel, kelas, siswa) dan **Pengaturan** (identitas + bobot).

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: **Add New → Project → Import** repo ini → Deploy (tidak perlu environment variable).
3. Setiap push ke branch utama = deploy otomatis.

## Pengembangan lokal

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint     # typecheck (tsc --noEmit)
npm run build    # production build
node test/smoke.mjs  # smoke test backend Kode.gs (37 kasus, tanpa Google asli)
```

## Catatan rumus Nilai Akhir

Satu rumus dipakai di frontend (`src/utils/format.ts → hitungNA`) dan backend (`Kode.gs → hitungNA`):

```
NA = (rataPH × bobotPH + PTS × bobotPTS + PAS × bobotPAS + KTR × bobotKTR + Sikap × bobotSikap) ÷ 100
```

Hanya nilai PH > 0 yang dihitung dalam rata-rata. Semua nilai dibatasi 0–100. Hasil dibulatkan 1 desimal.
