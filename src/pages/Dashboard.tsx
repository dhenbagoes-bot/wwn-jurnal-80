import { useMemo } from 'react';
import { BookOpenText, CalendarDays, ClipboardList, NotebookPen, Users } from 'lucide-react';
import { Button, Card, PageHeader } from '../components/ui';
import { bulanBerjalan, formatTanggal, hitungAbsensi, todayYMD } from '../utils/format';
import type { PageProps } from './PageProps';

export default function Dashboard({ db, pindah }: PageProps) {
  const stat = useMemo(() => {
    const hariIni = todayYMD();
    const bln = bulanBerjalan();
    const jurnalHariIni = db.jurnal.filter((j) => j.tanggal === hariIni).length;
    const jurnalBulanIni = db.jurnal.filter((j) => j.tanggal.startsWith(bln)).length;
    const siswaAktif = db.siswa.filter((s) => s.statusAktif).length;
    const guruAktif = db.guru.filter((g) => g.statusAktif).length;
    return { jurnalHariIni, jurnalBulanIni, siswaAktif, guruAktif };
  }, [db]);

  const terbaru = useMemo(
    () =>
      [...db.jurnal]
        .sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1))
        .slice(0, 5),
    [db.jurnal]
  );

  const kartu = [
    { label: 'Jurnal Hari Ini', nilai: stat.jurnalHariIni, icon: <CalendarDays className="h-6 w-6" />, warna: 'bg-emerald-500' },
    { label: 'Jurnal Bulan Ini', nilai: stat.jurnalBulanIni, icon: <BookOpenText className="h-6 w-6" />, warna: 'bg-blue-500' },
    { label: 'Guru Aktif', nilai: stat.guruAktif, icon: <Users className="h-6 w-6" />, warna: 'bg-amber-500' },
    { label: 'Siswa Aktif', nilai: stat.siswaAktif, icon: <ClipboardList className="h-6 w-6" />, warna: 'bg-violet-500' },
  ];

  return (
    <div>
      <PageHeader
        judul={`Assalamu'alaikum 👋`}
        subjudul={db.pengaturan.namaSekolah || 'Sistem Digital Jurnal Mengajar'}
        aksi={
          <Button onClick={() => pindah('jurnal-baru')}>
            <NotebookPen className="h-4 w-4" /> Isi Jurnal Baru
          </Button>
        }
      />

      {db.pengaturan.logoUrl && (
        <Card className="mb-4 flex items-center gap-4">
          <img
            src={db.pengaturan.logoUrl}
            alt="Logo sekolah"
            className="h-16 w-16 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
          />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-slate-900">{db.pengaturan.namaSekolah || 'Jurnal Mengajar Digital'}</p>
            {db.pengaturan.alamat && <p className="truncate text-xs text-slate-500">{db.pengaturan.alamat}</p>}
            {db.pengaturan.tahunPelajaran && (
              <p className="text-xs font-semibold text-emerald-700">Tahun Pelajaran {db.pengaturan.tahunPelajaran}</p>
            )}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kartu.map((k) => (
          <Card key={k.label} className="flex items-center gap-3">
            <div className={`rounded-xl p-2.5 text-white ${k.warna}`}>{k.icon}</div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{k.nilai}</p>
              <p className="text-xs text-slate-500">{k.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Jurnal Terbaru</h2>
          <button onClick={() => pindah('jurnal-data')} className="text-sm font-semibold text-emerald-600 hover:underline">
            Lihat Semua →
          </button>
        </div>
        {terbaru.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Belum ada jurnal. Yuk isi jurnal pertama hari ini!
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {terbaru.map((j) => {
              const ab = hitungAbsensi(j.absensi);
              return (
                <div key={j.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {j.mapelNama} • {j.kelasNama}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {j.guruNama} — {formatTanggal(j.tanggal)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    H:{ab.H} S:{ab.S} I:{ab.I} A:{ab.A}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
