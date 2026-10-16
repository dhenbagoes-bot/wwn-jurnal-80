import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button, Card, EmptyState, Field, PageHeader, SelectInput, TextInput } from '../components/ui';
import { bulanBerjalan, formatBulan, hitungAbsensi, todayYMD, unduhCsv } from '../utils/format';
import type { PageProps } from './PageProps';

export default function Rekap({ db }: PageProps) {
  const [tab, setTab] = useState<'absensi' | 'guru'>('absensi');
  const [kelasId, setKelasId] = useState('');
  const [bulan, setBulan] = useState(bulanBerjalan());

  const daftarKelas = useMemo(() => [...db.kelas].sort((a, b) => a.nama.localeCompare(b.nama)), [db.kelas]);

  // ---- Rekap absensi per siswa ----
  const rekapAbsensi = useMemo(() => {
    if (!kelasId || !bulan) return [];
    const siswa = db.siswa
      .filter((s) => s.kelasId === kelasId && s.statusAktif)
      .sort((a, b) => a.nama.localeCompare(b.nama));
    const jurnal = db.jurnal.filter((j) => j.kelasId === kelasId && j.tanggal.startsWith(bulan));
    return siswa.map((s) => {
      let H = 0, S = 0, I = 0, A = 0, temu = 0;
      for (const j of jurnal) {
        const st = j.absensi[s.id];
        if (st === 'H' || st === 'S' || st === 'I' || st === 'A') {
          temu++;
          if (st === 'H') H++; else if (st === 'S') S++; else if (st === 'I') I++; else A++;
        }
      }
      const persen = temu > 0 ? Math.round((H / temu) * 1000) / 10 : 0;
      return { ...s, H, S, I, A, temu, persen };
    });
  }, [db.jurnal, db.siswa, kelasId, bulan]);

  // ---- Rekap jurnal per guru ----
  const rekapGuru = useMemo(() => {
    if (!bulan) return [];
    const aktif = db.guru.filter((g) => g.statusAktif).sort((a, b) => a.nama.localeCompare(b.nama));
    return aktif.map((g) => {
      const jn = db.jurnal.filter((j) => j.guruId === g.id && j.tanggal.startsWith(bulan));
      const mapel = [...new Set(jn.map((j) => j.mapelNama))].filter(Boolean);
      const kelas = [...new Set(jn.map((j) => j.kelasNama))].filter(Boolean);
      let hadir = 0, total = 0;
      for (const j of jn) {
        const ab = hitungAbsensi(j.absensi);
        hadir += ab.H; total += ab.total;
      }
      return { guru: g, jumlah: jn.length, mapel: mapel.join(', ') || '-', kelas: kelas.join(', ') || '-', hadir, total };
    });
  }, [db.jurnal, db.guru, bulan]);

  const eksporAbsensi = () => {
    const k = daftarKelas.find((x) => x.id === kelasId);
    unduhCsv(
      `rekap-absensi-${k?.nama || 'kelas'}-${bulan}`,
      ['No', 'Nama', 'NIS', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Pertemuan', '% Kehadiran'],
      rekapAbsensi.map((r, i) => [i + 1, r.nama, r.nis, r.H, r.S, r.I, r.A, r.temu, r.persen])
    );
  };

  const eksporGuru = () => {
    unduhCsv(
      `rekap-guru-${bulan}`,
      ['No', 'Nama Guru', 'Jumlah Jurnal', 'Mapel Diampu', 'Kelas Diampu', 'Siswa Hadir', 'Total Absensi'],
      rekapGuru.map((r, i) => [i + 1, r.guru.nama, r.jumlah, r.mapel, r.kelas, r.hadir, r.total])
    );
  };

  return (
    <div>
      <PageHeader judul="Rekapitulasi" subjudul="Rekap absensi siswa & kinerja jurnal guru per bulan" />

      <div className="mb-4 flex gap-2">
        {(['absensi', 'guru'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              tab === t ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {t === 'absensi' ? 'Rekap Absensi' : 'Rekap Guru'}
          </button>
        ))}
      </div>

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Bulan">
            <TextInput type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} max={todayYMD().slice(0, 7)} />
          </Field>
          {tab === 'absensi' && (
            <Field label="Kelas">
              <SelectInput value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
                <option value="">— Pilih Kelas —</option>
                {daftarKelas.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </SelectInput>
            </Field>
          )}
        </div>
      </Card>

      {tab === 'absensi' ? (
        <>
          {!kelasId ? (
            <EmptyState judul="Pilih kelas terlebih dahulu" subjudul="Rekap absensi ditampilkan per siswa dalam satu kelas." />
          ) : rekapAbsensi.length === 0 ? (
            <EmptyState judul="Tidak ada siswa aktif di kelas ini" />
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <h2 className="font-bold">Rekap Absensi — {formatBulan(bulan)}</h2>
                <Button varian="hijau" kecil onClick={eksporAbsensi}>
                  <FileDown className="h-4 w-4" /> Excel
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">No</th>
                      <th className="px-4 py-3">Nama Siswa</th>
                      <th className="px-4 py-3 text-center">H</th>
                      <th className="px-4 py-3 text-center">S</th>
                      <th className="px-4 py-3 text-center">I</th>
                      <th className="px-4 py-3 text-center">A</th>
                      <th className="px-4 py-3 text-center">% Hadir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rekapAbsensi.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                        <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{r.H}</td>
                        <td className="px-4 py-2.5 text-center">{r.S}</td>
                        <td className="px-4 py-2.5 text-center">{r.I}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-red-500">{r.A}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.persen >= 90 ? 'bg-emerald-100 text-emerald-700' : r.persen >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {r.persen}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <h2 className="font-bold">Rekap Jurnal Guru — {formatBulan(bulan)}</h2>
            <Button varian="hijau" kecil onClick={eksporGuru} disabled={rekapGuru.length === 0}>
              <FileDown className="h-4 w-4" /> Excel
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Guru</th>
                  <th className="px-4 py-3 text-center">Jml Jurnal</th>
                  <th className="px-4 py-3">Mapel</th>
                  <th className="px-4 py-3">Kelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapGuru.map((r, i) => (
                  <tr key={r.guru.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium">{r.guru.nama}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">{r.jumlah}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5 text-xs text-slate-500">{r.mapel}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.kelas}</td>
                  </tr>
                ))}
                {rekapGuru.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Belum ada data guru.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
