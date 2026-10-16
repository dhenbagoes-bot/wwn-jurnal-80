import * as XLSX from 'xlsx';

// ============================================================
// Template & parser Excel untuk impor data massal (Kelola Data)
// ============================================================

export type TemplateKind = 'guru' | 'mapel' | 'kelas' | 'siswa';

interface TemplateDef {
  judul: string;
  namaFile: string;
  headers: string[];
  contoh: string[][];
  catatan: string[];
}

export const TEMPLATE_DEFS: Record<TemplateKind, TemplateDef> = {
  guru: {
    judul: 'Data Guru',
    namaFile: 'template-guru.xlsx',
    headers: ['Nama*', 'NIP', 'Mapel', 'Status (Aktif/Nonaktif)'],
    contoh: [
      ['Budi Santoso', '198001012010011001', 'Matematika', 'Aktif'],
      ['Siti Aminah', '', 'Bahasa Indonesia', 'Aktif'],
    ],
    catatan: [
      'Kolom bertanda * wajib diisi.',
      'Baris contoh di bawah header boleh dihapus/diubah.',
      'Status diisi "Aktif" atau "Nonaktif" (kosong = Aktif).',
      'Jika nama sudah ada di database, datanya akan diperbarui (tidak duplikat).',
    ],
  },
  mapel: {
    judul: 'Data Mata Pelajaran',
    namaFile: 'template-mapel.xlsx',
    headers: ['Nama Mapel*', 'Kelompok'],
    contoh: [
      ['Matematika', 'A'],
      ['Bahasa Indonesia', 'A'],
      ['Tahfidz', 'Muatan Lokal'],
    ],
    catatan: [
      'Kolom bertanda * wajib diisi.',
      'Jika nama mapel sudah ada, datanya akan diperbarui.',
    ],
  },
  kelas: {
    judul: 'Data Kelas',
    namaFile: 'template-kelas.xlsx',
    headers: ['Nama Kelas*', 'Tingkat', 'Wali Kelas'],
    contoh: [
      ['7A', 'VII', 'Budi Santoso'],
      ['7B', 'VII', 'Siti Aminah'],
    ],
    catatan: [
      'Kolom bertanda * wajib diisi.',
      'Jika nama kelas sudah ada, datanya akan diperbarui.',
    ],
  },
  siswa: {
    judul: 'Data Siswa',
    namaFile: 'template-siswa.xlsx',
    headers: ['Nama*', 'NIS', 'Kelas*', 'L/P', 'Status (Aktif/Nonaktif)'],
    contoh: [
      ['Ahmad Fauzi', '001', '7A', 'L', 'Aktif'],
      ['Dewi Lestari', '002', '7A', 'P', 'Aktif'],
    ],
    catatan: [
      'Kolom bertanda * wajib diisi.',
      'Kolom "Kelas" diisi NAMA kelas yang sudah ada di database (contoh: 7A).',
      'Kolom "L/P" diisi L atau P (kosong = L).',
      'Jika nama siswa + kelas sudah ada, datanya akan diperbarui.',
    ],
  },
};

/** Unduh file template .xlsx untuk jenis data tertentu. */
export function unduhTemplate(kind: TemplateKind): void {
  const def = TEMPLATE_DEFS[kind];
  const ws = XLSX.utils.aoa_to_sheet([
    def.headers,
    ...def.contoh,
    [],
    ['CATATAN:'],
    ...def.catatan.map((c) => ['- ' + c]),
  ]);
  // Lebar kolom otomatis secukupnya
  ws['!cols'] = def.headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.judul);
  XLSX.writeFile(wb, def.namaFile);
}

export interface ParsedSheet {
  headers: string[];
  rows: string[][];
}

/** Baca file .xlsx/.xls/.csv → {headers, rows}. Baris kosong dilewati. */
export function parseFileExcel(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.onload = () => {
      try {
        const buf = reader.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        if (!sheetName) throw new Error('File tidak berisi sheet.');
        const ws = wb.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '', raw: false });
        // Buang baris yang seluruhnya kosong
        const bersih = aoa.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
        if (bersih.length === 0) throw new Error('File kosong.');
        const headers = bersih[0].map((h) => String(h ?? '').trim());
        // Hentikan di baris CATATAN (template menyertakan catatan di bawah)
        const rows: string[][] = [];
        for (let i = 1; i < bersih.length; i++) {
          const r0 = String(bersih[i][0] ?? '').trim().toUpperCase();
          if (r0 === 'CATATAN:' || r0.startsWith('- ')) break;
          rows.push(bersih[i].map((c) => String(c ?? '').trim()));
        }
        resolve({ headers, rows });
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Format file tidak dikenali.'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/** Normalisasi header template: "Nama*" → "nama", "L/P" → "l/p", dst. */
export function normalisasiHeader(h: string): string {
  return h.replace(/\*/g, '').trim().toLowerCase();
}
