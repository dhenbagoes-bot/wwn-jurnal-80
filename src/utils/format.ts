import type { AbsensiMap, JurnalItem, StatusAbsen } from '../types';

// ============================================================
// Helper format & utilitas (satu sumber kebenaran untuk format)
// ============================================================

/** yyyy-mm-dd hari ini (zona waktu lokal browser). */
export function todayYMD(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** yyyy-mm-dd -> "21 Juli 2026" (konsisten di seluruh aplikasi). */
export function formatTanggal(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '-';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** yyyy-mm-dd -> "Senin, 21 Juli 2026" */
export function formatTanggalPanjang(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '-';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return ymd;
  return dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

/** yyyy-mm-dd -> "21/07/2026" (ringkas, untuk tabel). */
export function formatTanggalPendek(ymd: string): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd || '-';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

/** yyyy-mm -> "Juli 2026" */
export function formatBulan(ym: string): string {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return ym || '-';
  const [y, m] = ym.split('-').map(Number);
  const dt = new Date(y, m - 1, 1);
  return dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

/** Bulan berjalan yyyy-mm */
export function bulanBerjalan(): string {
  return todayYMD().slice(0, 7);
}

export function formatJamMenit(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Hitung rekap absensi dari peta absensi. */
export function hitungAbsensi(absensi: AbsensiMap): { H: number; S: number; I: number; A: number; total: number } {
  const r = { H: 0, S: 0, I: 0, A: 0, total: 0 };
  for (const v of Object.values(absensi || {})) {
    if (v === 'H' || v === 'S' || v === 'I' || v === 'A') {
      r[v] += 1;
      r.total += 1;
    }
  }
  return r;
}

/** Label ringkas absensi: "H=28, S=1, I=0, A=1" */
export function labelAbsensi(absensi: AbsensiMap): string {
  const r = hitungAbsensi(absensi);
  return `H=${r.H}, S=${r.S}, I=${r.I}, A=${r.A}`;
}

export const STATUS_ABSEN: StatusAbsen[] = ['H', 'S', 'I', 'A'];
export const STATUS_ABSEN_LABEL: Record<StatusAbsen, string> = {
  H: 'Hadir',
  S: 'Sakit',
  I: 'Izin',
  A: 'Alpa',
};

/** ID unik berawalan prefix, mis. "JRN-lxyz123". */
export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

/** Nilai 0-100 yang aman dari input teks. */
export function toNilai(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}

/**
 * Hitung Nilai Akhir — RUMUS TUNGGAL, harus sama dengan backend (Kode.gs: hitungNA).
 * NA = (rataPH*bobotPH + PTS*bobotPTS + PAS*bobotPAS + KTR*bobotKTR + Sikap*bobotSikap) / 100
 */
export function hitungNA(
  ph: number[],
  pts: number,
  pas: number,
  ktr: number,
  sikap: number,
  bobot: { bobotPH: number; bobotPTS: number; bobotPAS: number; bobotKTR: number; bobotSikap: number }
): number {
  const bersih = ph.map(toNilai).filter((n) => n > 0);
  const rataPH = bersih.length > 0 ? bersih.reduce((a, b) => a + b, 0) / bersih.length : 0;
  const na =
    (rataPH * bobot.bobotPH +
      toNilai(pts) * bobot.bobotPTS +
      toNilai(pas) * bobot.bobotPAS +
      toNilai(ktr) * bobot.bobotKTR +
      toNilai(sikap) * bobot.bobotSikap) /
    100;
  return Math.round(na * 10) / 10;
}

/** Escape nilai untuk CSV (Excel Indonesia memakai ; sebagai pemisah). */
function escCsv(v: unknown): string {
  const s = String(v ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Unduh array baris sebagai file CSV (terbuka rapi di Excel). */
export function unduhCsv(namaFile: string, header: string[], baris: unknown[][]): void {
  const bom = '﻿'; // U+FEFF — agar Excel membaca UTF-8 dengan benar
  const isi = [header.map(escCsv).join(';')]
    .concat(baris.map((b) => b.map(escCsv).join(';')))
    .join('\r\n');
  const blob = new Blob([bom + isi], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaFile.endsWith('.csv') ? namaFile : `${namaFile}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Filter jurnal berdasarkan kriteria (dipakai Data Jurnal & Laporan — satu logika). */
export function filterJurnal(
  daftar: JurnalItem[],
  f: { dari: string; sampai: string; guruId: string; mapelId: string; kelasId: string; cari: string }
): JurnalItem[] {
  const cari = f.cari.trim().toLowerCase();
  return daftar
    .filter((j) => {
      if (f.dari && j.tanggal < f.dari) return false;
      if (f.sampai && j.tanggal > f.sampai) return false;
      if (f.guruId && j.guruId !== f.guruId) return false;
      if (f.mapelId && j.mapelId !== f.mapelId) return false;
      if (f.kelasId && j.kelasId !== f.kelasId) return false;
      if (cari) {
        const hay = `${j.guruNama} ${j.mapelNama} ${j.kelasNama} ${j.materiPokok} ${j.tujuanPembelajaran} ${j.catatan}`.toLowerCase();
        if (!hay.includes(cari)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.tanggal < b.tanggal ? 1 : a.tanggal > b.tanggal ? -1 : b.dibuatPada.localeCompare(a.dibuatPada)));
}
