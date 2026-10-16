import { useMemo, useState } from 'react';
import { FileDown, Printer, Search } from 'lucide-react';
import { Button, Card, Field, PageHeader, SelectInput, TextInput } from '../components/ui';
import { filterJurnal, formatTanggal, hitungAbsensi, labelAbsensi, todayYMD, unduhCsv } from '../utils/format';
import type { PageProps } from './PageProps';

export default function Laporan({ db }: PageProps) {
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [guruId, setGuruId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [cari, setCari] = useState('');

  const hasil = useMemo(
    () => filterJurnal(db.jurnal, { dari, sampai, guruId, mapelId, kelasId, cari }),
    [db.jurnal, dari, sampai, guruId, mapelId, kelasId, cari]
  );

  const ringkas = useMemo(() => {
    let H = 0, S = 0, I = 0, A = 0;
    for (const j of hasil) {
      const ab = hitungAbsensi(j.absensi);
      H += ab.H; S += ab.S; I += ab.I; A += ab.A;
    }
    const total = H + S + I + A;
    return { H, S, I, A, total, persen: total > 0 ? Math.round((H / total) * 1000) / 10 : 0 };
  }, [hasil]);

  const periode = dari || sampai
    ? `${dari ? formatTanggal(dari) : '...'} s.d. ${sampai ? formatTanggal(sampai) : '...'}`
    : 'Semua Periode';

  const eksporCsv = () => {
    unduhCsv(
      `laporan-jurnal-${todayYMD()}`,
      ['Tanggal', 'Guru', 'Mata Pelajaran', 'Kelas', 'Materi Pokok', 'Tujuan Pembelajaran', 'Hadir', 'Sakit', 'Izin', 'Alpa', 'Catatan'],
      hasil.map((j) => {
        const ab = hitungAbsensi(j.absensi);
        return [formatTanggal(j.tanggal), j.guruNama, j.mapelNama, j.kelasNama, j.materiPokok, j.tujuanPembelajaran, ab.H, ab.S, ab.I, ab.A, j.catatan];
      })
    );
  };

  return (
    <div>
      <PageHeader
        judul="Laporan Jurnal Mengajar"
        subjudul="Rekap jurnal siap cetak & unduh"
        aksi={
          <>
            <Button varian="biru" kecil onClick={() => window.print()} disabled={hasil.length === 0}>
              <Printer className="h-4 w-4" /> Cetak / PDF
            </Button>
            <Button varian="hijau" kecil onClick={eksporCsv} disabled={hasil.length === 0}>
              <FileDown className="h-4 w-4" /> Unduh Excel
            </Button>
          </>
        }
      />

      <Card className="mb-4 no-print">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Dari Tanggal">
            <TextInput type="date" value={dari} max={sampai || todayYMD()} onChange={(e) => setDari(e.target.value)} />
          </Field>
          <Field label="Sampai Tanggal">
            <TextInput type="date" value={sampai} min={dari} max={todayYMD()} onChange={(e) => setSampai(e.target.value)} />
          </Field>
          <Field label="Guru">
            <SelectInput value={guruId} onChange={(e) => setGuruId(e.target.value)}>
              <option value="">Semua Guru</option>
              {db.guru.filter((g) => g.statusAktif).map((g) => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Mata Pelajaran">
            <SelectInput value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
              <option value="">Semua Mapel</option>
              {db.mapel.map((m) => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Kelas">
            <SelectInput value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
              <option value="">Semua Kelas</option>
              {db.kelas.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Pencarian">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <TextInput value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari..." className="pl-9" />
            </div>
          </Field>
        </div>
      </Card>

      {/* Ringkasan */}
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {[
          { l: 'Jurnal', n: hasil.length },
          { l: 'Hadir', n: ringkas.H },
          { l: 'Sakit', n: ringkas.S },
          { l: 'Izin', n: ringkas.I },
          { l: 'Alpa', n: ringkas.A },
          { l: 'Kehadiran', n: `${ringkas.persen}%` },
        ].map((s) => (
          <Card key={s.l} className="!p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{s.n}</p>
            <p className="text-xs text-slate-500">{s.l}</p>
          </Card>
        ))}
      </div>

      {/* Area cetak */}
      <div id="print-area">
        <Card className="!p-0 overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-center gap-4">
              {db.pengaturan.logoUrl && (
                <img src={db.pengaturan.logoUrl} alt="Logo" className="h-16 w-16 shrink-0 object-contain" />
              )}
              <div className="text-center">
                <h2 className="text-lg font-bold uppercase">{db.pengaturan.namaSekolah || 'Laporan Jurnal Mengajar'}</h2>
                {db.pengaturan.alamat && <p className="text-xs text-slate-500">{db.pengaturan.alamat}</p>}
                <p className="mt-1 text-sm text-slate-500">Periode: {periode} • {hasil.length} jurnal</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5">No</th>
                  <th className="px-3 py-2.5">Tanggal</th>
                  <th className="px-3 py-2.5">Guru</th>
                  <th className="px-3 py-2.5">Mapel (Kelas)</th>
                  <th className="px-3 py-2.5">Materi & Tujuan</th>
                  <th className="px-3 py-2.5">Absensi</th>
                  <th className="px-3 py-2.5">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hasil.map((j, i) => (
                  <tr key={j.id}>
                    <td className="px-3 py-2.5 text-slate-400">{i + 1}</td>
                    <td className="whitespace-nowrap px-3 py-2.5">{formatTanggal(j.tanggal)}</td>
                    <td className="px-3 py-2.5">{j.guruNama}</td>
                    <td className="px-3 py-2.5">{j.mapelNama} ({j.kelasNama})</td>
                    <td className="max-w-[260px] px-3 py-2.5">
                      <p className="font-medium">{j.materiPokok || '-'}</p>
                      {j.tujuanPembelajaran && <p className="text-xs text-slate-500">{j.tujuanPembelajaran}</p>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs">{labelAbsensi(j.absensi)}</td>
                    <td className="max-w-[200px] px-3 py-2.5 text-xs text-slate-500">{j.catatan || '-'}</td>
                  </tr>
                ))}
                {hasil.length === 0 && (
                  <tr><td colSpan={7} className="px-3 py-10 text-center text-slate-400">Tidak ada data pada filter ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-16 p-4 text-center text-sm">
            <div>
              <p className="mb-12">Mengetahui,<br />Kepala Madrasah</p>
              <p className="font-semibold underline">{db.pengaturan.kepalaSekolah || '( .............................. )'}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
