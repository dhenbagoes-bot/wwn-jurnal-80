import { useRef, useState } from 'react';
import { Download, FileUp, Loader2, Upload } from 'lucide-react';
import { Button, Modal } from './ui';
import { saveGuru, saveKelas, saveMapel, saveSiswa } from '../services/gasApi';
import { normalisasiHeader, parseFileExcel, TEMPLATE_DEFS, unduhTemplate, type TemplateKind } from '../utils/excel';
import type { AppDatabase, GuruItem, KelasItem, MapelItem, SiswaItem, ToastMsg } from '../types';

// ============================================================
// Modal impor Excel: pilih file → pratinjau + validasi → impor
// ============================================================

type EntityItem = GuruItem | MapelItem | KelasItem | SiswaItem;

interface BarisValid {
  no: number;
  mentah: string[];
  item: EntityItem | null;
  errors: string[];
  mode: 'baru' | 'perbarui' | '-';
}

const HEADER_WAJIB: Record<TemplateKind, string[]> = {
  guru: ['nama', 'nip', 'mapel', 'status (aktif/nonaktif)'],
  mapel: ['nama mapel', 'kelompok'],
  kelas: ['nama kelas', 'tingkat', 'wali kelas'],
  siswa: ['nama', 'nis', 'kelas', 'l/p', 'status (aktif/nonaktif)'],
};

function statusAktifDari(v: string): boolean {
  return v.trim().toLowerCase() !== 'nonaktif';
}

export default function ExcelUploadModal({
  kind,
  db,
  apiUrl,
  toast,
  onTutup,
  onSelesai,
}: {
  kind: TemplateKind;
  db: AppDatabase;
  apiUrl: string;
  toast: (tipe: ToastMsg['tipe'], pesan: string) => void;
  onTutup: () => void;
  onSelesai: () => void;
}) {
  const [namaFile, setNamaFile] = useState('');
  const [baris, setBaris] = useState<BarisValid[]>([]);
  const [galatFile, setGalatFile] = useState('');
  const [memproses, setMemproses] = useState(false);
  const [mengimpor, setMengimpor] = useState(false);
  const [progres, setProgres] = useState({ jalan: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  const validasi = (headers: string[], rows: string[][]): BarisValid[] => {
    const idx = (nama: string) => headers.findIndex((h) => normalisasiHeader(h) === nama);
    const hasil: BarisValid[] = [];

    rows.forEach((r, i) => {
      const ambil = (nama: string) => {
        const p = idx(nama);
        return p >= 0 ? (r[p] || '').trim() : '';
      };
      const errors: string[] = [];
      let item: EntityItem | null = null;
      let mode: BarisValid['mode'] = '-';
      const samaNama = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

      if (kind === 'guru') {
        const nama = ambil('nama');
        if (!nama) errors.push('Nama kosong');
        if (errors.length === 0) {
          const ada = db.guru.find((g) => samaNama(g.nama, nama));
          mode = ada ? 'perbarui' : 'baru';
          item = { id: ada?.id || '', nama, nip: ambil('nip'), mapel: ambil('mapel'), statusAktif: statusAktifDari(ambil('status (aktif/nonaktif)')) };
        }
      } else if (kind === 'mapel') {
        const nama = ambil('nama mapel');
        if (!nama) errors.push('Nama mapel kosong');
        if (errors.length === 0) {
          const ada = db.mapel.find((m) => samaNama(m.nama, nama));
          mode = ada ? 'perbarui' : 'baru';
          item = { id: ada?.id || '', nama, kelompok: ambil('kelompok') };
        }
      } else if (kind === 'kelas') {
        const nama = ambil('nama kelas');
        if (!nama) errors.push('Nama kelas kosong');
        if (errors.length === 0) {
          const ada = db.kelas.find((k) => samaNama(k.nama, nama));
          mode = ada ? 'perbarui' : 'baru';
          item = { id: ada?.id || '', nama, tingkat: ambil('tingkat'), waliKelas: ambil('wali kelas') };
        }
      } else {
        const nama = ambil('nama');
        const kelasNama = ambil('kelas');
        if (!nama) errors.push('Nama kosong');
        if (!kelasNama) errors.push('Kelas kosong');
        const kelas = db.kelas.find((k) => samaNama(k.nama, kelasNama));
        if (kelasNama && !kelas) errors.push(`Kelas "${kelasNama}" tidak ada di database`);
        if (errors.length === 0 && kelas) {
          const ada = db.siswa.find((s) => s.kelasId === kelas.id && samaNama(s.nama, nama));
          mode = ada ? 'perbarui' : 'baru';
          item = {
            id: ada?.id || '',
            nama,
            nis: ambil('nis'),
            kelasId: kelas.id,
            kelasNama: kelas.nama,
            jenisKelamin: ambil('l/p').toUpperCase() === 'P' ? 'P' : 'L',
            statusAktif: statusAktifDari(ambil('status (aktif/nonaktif)')),
          };
        }
      }

      hasil.push({ no: i + 2, mentah: r, item, errors, mode });
    });
    return hasil;
  };

  const pilihFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setGalatFile('Ukuran file maksimal 5 MB.');
      return;
    }
    setMemproses(true);
    setGalatFile('');
    try {
      const { headers, rows } = await parseFileExcel(file);
      const wajib = HEADER_WAJIB[kind];
      const normal = headers.map(normalisasiHeader);
      const cocok = wajib.every((w, i) => normal[i] === w);
      if (!cocok) {
        setGalatFile(`Header file tidak sesuai template ${TEMPLATE_DEFS[kind].judul}. Unduh template dulu lewat tombol "Unduh Template".`);
        setBaris([]);
        setNamaFile('');
        return;
      }
      if (rows.length === 0) {
        setGalatFile('Tidak ada baris data di file.');
        setBaris([]);
        return;
      }
      setNamaFile(file.name);
      setBaris(validasi(headers, rows));
    } catch (e) {
      setGalatFile(e instanceof Error ? e.message : 'Gagal membaca file.');
      setBaris([]);
    } finally {
      setMemproses(false);
    }
  };

  const valid = baris.filter((b) => b.errors.length === 0 && b.item);
  const bermasalah = baris.filter((b) => b.errors.length > 0);

  const impor = async () => {
    if (mengimpor || valid.length === 0) return;
    setMengimpor(true);
    setProgres({ jalan: 0, total: valid.length });
    let berhasil = 0;
    let gagal = 0;
    for (let i = 0; i < valid.length; i++) {
      const b = valid[i];
      try {
        let res;
        if (kind === 'guru') res = await saveGuru(apiUrl, b.item as GuruItem);
        else if (kind === 'mapel') res = await saveMapel(apiUrl, b.item as MapelItem);
        else if (kind === 'kelas') res = await saveKelas(apiUrl, b.item as KelasItem);
        else res = await saveSiswa(apiUrl, b.item as SiswaItem);
        if (res.success) berhasil++;
        else gagal++;
      } catch {
        gagal++;
      }
      setProgres({ jalan: i + 1, total: valid.length });
    }
    setMengimpor(false);
    if (gagal === 0) toast('sukses', `${berhasil} data berhasil diimpor.`);
    else toast('error', `${berhasil} berhasil, ${gagal} gagal diimpor.`);
    onSelesai();
  };

  return (
    <Modal judul={`Impor ${TEMPLATE_DEFS[kind].judul} dari Excel`} onTutup={onTutup} lebar="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button varian="sekunder" kecil onClick={() => unduhTemplate(kind)}>
          <Download className="h-4 w-4" /> Unduh Template
        </Button>
        <Button varian="sekunder" kecil onClick={() => inputRef.current?.click()} disabled={memproses}>
          <FileUp className="h-4 w-4" /> Pilih File Excel/CSV
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            pilihFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {memproses && <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />}
      </div>

      {galatFile && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{galatFile}</p>
      )}

      {baris.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">{valid.length} baris valid</span>
            {bermasalah.length > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">{bermasalah.length} baris bermasalah</span>
            )}
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-500">{namaFile}</span>
          </div>
          <div className="max-h-[320px] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Baris</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {baris.map((b, i) => (
                  <tr key={i} className={b.errors.length > 0 ? 'bg-red-50/50' : ''}>
                    <td className="px-3 py-2 text-slate-400">{b.no}</td>
                    <td className="px-3 py-2">{b.mentah.filter(Boolean).join(' • ') || '-'}</td>
                    <td className="px-3 py-2">
                      {b.errors.length > 0 ? (
                        <span className="font-semibold text-red-600">{b.errors.join('; ')}</span>
                      ) : (
                        <span className={`rounded-full px-2 py-0.5 font-bold ${b.mode === 'baru' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {b.mode === 'baru' ? 'Baru' : 'Perbarui'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mengimpor && (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${progres.total ? Math.round((progres.jalan / progres.total) * 100) : 0}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Mengimpor {progres.jalan}/{progres.total}...</p>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button varian="sekunder" onClick={onTutup} disabled={mengimpor}>Batal</Button>
            <Button onClick={impor} loading={mengimpor} disabled={valid.length === 0}>
              <Upload className="h-4 w-4" /> Impor {valid.length} Data
            </Button>
          </div>
        </>
      )}

      {baris.length === 0 && !galatFile && (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
          Unduh template, isi datanya di Excel, lalu pilih file-nya di sini. Baris yang datanya
          bermasalah akan ditandai dan dilewati — hanya baris valid yang diimpor.
        </p>
      )}
    </Modal>
  );
}
