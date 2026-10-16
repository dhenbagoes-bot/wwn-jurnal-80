import { useEffect, useMemo, useState } from 'react';
import { CheckCheck, Save } from 'lucide-react';
import { Button, Card, Field, PageHeader, SelectInput, TextAreaInput, TextInput } from '../components/ui';
import { saveJurnal } from '../services/gasApi';
import { STATUS_ABSEN, STATUS_ABSEN_LABEL, todayYMD } from '../utils/format';
import type { AbsensiMap, JurnalItem, StatusAbsen } from '../types';
import type { PageProps } from './PageProps';

interface Props extends PageProps {
  editData: JurnalItem | null;
  onSelesai: () => void;
}

const WARNA_ABSEN: Record<StatusAbsen, string> = {
  H: 'bg-emerald-600 text-white border-emerald-600',
  S: 'bg-amber-500 text-white border-amber-500',
  I: 'bg-blue-600 text-white border-blue-600',
  A: 'bg-red-600 text-white border-red-600',
};

export default function JurnalForm({ db, apiUrl, refresh, toast, onSelesai, editData }: Props) {
  const modeEdit = !!editData;
  const [tanggal, setTanggal] = useState(todayYMD());
  const [guruId, setGuruId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [materi, setMateri] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [absensi, setAbsensi] = useState<AbsensiMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [menyimpan, setMenyimpan] = useState(false);

  // Prefill saat mode edit (atau reset saat tambah baru)
  useEffect(() => {
    if (editData) {
      setTanggal(editData.tanggal);
      setGuruId(editData.guruId);
      setMapelId(editData.mapelId);
      setKelasId(editData.kelasId);
      setMateri(editData.materiPokok);
      setTujuan(editData.tujuanPembelajaran);
      setCatatan(editData.catatan);
      setAbsensi({ ...editData.absensi });
    } else {
      setTanggal(todayYMD());
      setGuruId('');
      setMapelId('');
      setKelasId('');
      setMateri('');
      setTujuan('');
      setCatatan('');
      setAbsensi({});
    }
    setErrors({});
  }, [editData]);

  const guruAktif = useMemo(() => db.guru.filter((g) => g.statusAktif).sort((a, b) => a.nama.localeCompare(b.nama)), [db.guru]);
  const daftarMapel = useMemo(() => [...db.mapel].sort((a, b) => a.nama.localeCompare(b.nama)), [db.mapel]);
  const daftarKelas = useMemo(() => [...db.kelas].sort((a, b) => a.nama.localeCompare(b.nama)), [db.kelas]);

  const siswaKelas = useMemo(
    () =>
      db.siswa
        .filter((s) => s.kelasId === kelasId && s.statusAktif)
        .sort((a, b) => a.nama.localeCompare(b.nama)),
    [db.siswa, kelasId]
  );

  // Saat kelas dipilih (mode tambah): isi absensi default Hadir untuk semua siswa
  const pilihKelas = (id: string) => {
    setKelasId(id);
    if (!modeEdit) {
      const baru: AbsensiMap = {};
      db.siswa
        .filter((s) => s.kelasId === id && s.statusAktif)
        .forEach((s) => {
          baru[s.id] = 'H';
        });
      setAbsensi(baru);
    } else {
      // Mode edit: pertahankan yang sudah ada, siswa baru default Hadir
      setAbsensi((lama) => {
        const gabung: AbsensiMap = { ...lama };
        db.siswa
          .filter((s) => s.kelasId === id && s.statusAktif)
          .forEach((s) => {
            if (!gabung[s.id]) gabung[s.id] = 'H';
          });
        return gabung;
      });
    }
  };

  const setSemua = (st: StatusAbsen) => {
    const baru: AbsensiMap = {};
    siswaKelas.forEach((s) => {
      baru[s.id] = st;
    });
    setAbsensi(baru);
  };

  const validasi = (): boolean => {
    const e: Record<string, string> = {};
    if (!tanggal) e.tanggal = 'Tanggal wajib diisi.';
    if (!guruId) e.guru = 'Pilih nama guru.';
    if (!mapelId) e.mapel = 'Pilih mata pelajaran.';
    if (!kelasId) e.kelas = 'Pilih kelas.';
    if (kelasId && siswaKelas.length === 0) e.kelas = 'Kelas ini belum memiliki data siswa aktif.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const simpan = async () => {
    if (!validasi() || menyimpan) return;
    setMenyimpan(true);
    try {
      const guru = db.guru.find((g) => g.id === guruId);
      const mapel = db.mapel.find((m) => m.id === mapelId);
      const kelas = db.kelas.find((k) => k.id === kelasId);
      // Bersihkan absensi: hanya siswa kelas terpilih yang aktif (hindari sisa kelas lain)
      const absensiBersih: AbsensiMap = {};
      db.siswa
        .filter((s) => s.kelasId === kelasId && s.statusAktif)
        .forEach((s) => {
          absensiBersih[s.id] = absensi[s.id] || 'H';
        });
      const item: JurnalItem = {
        id: editData?.id || '',
        tanggal,
        guruId,
        guruNama: guru?.nama || '',
        mapelId,
        mapelNama: mapel?.nama || '',
        kelasId,
        kelasNama: kelas?.nama || '',
        materiPokok: materi.trim(),
        tujuanPembelajaran: tujuan.trim(),
        absensi: absensiBersih,
        catatan: catatan.trim(),
        dibuatPada: editData?.dibuatPada || '',
        diubahPada: '',
      };
      const res = await saveJurnal(apiUrl, item);
      if (res.success) {
        toast('sukses', modeEdit ? 'Jurnal berhasil diperbarui.' : 'Jurnal berhasil disimpan.');
        await refresh();
        onSelesai();
      } else {
        toast('error', res.error || res.message || 'Gagal menyimpan jurnal.');
      }
    } catch {
      toast('error', 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div>
      <PageHeader
        judul={modeEdit ? 'Edit Jurnal Mengajar' : 'Isi Jurnal Mengajar'}
        subjudul={modeEdit ? 'Perbarui data jurnal yang sudah tersimpan.' : 'Catat kegiatan mengajar hari ini.'}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Hari / Tanggal" error={errors.tanggal}>
              <TextInput type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} max={todayYMD()} />
            </Field>
            <Field label="Nama Guru" error={errors.guru}>
              <SelectInput value={guruId} onChange={(e) => setGuruId(e.target.value)}>
                <option value="">— Pilih Guru —</option>
                {guruAktif.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nama}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Mata Pelajaran" error={errors.mapel}>
              <SelectInput value={mapelId} onChange={(e) => setMapelId(e.target.value)}>
                <option value="">— Pilih Mapel —</option>
                {daftarMapel.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Kelas" error={errors.kelas}>
              <SelectInput value={kelasId} onChange={(e) => pilihKelas(e.target.value)}>
                <option value="">— Pilih Kelas —</option>
                {daftarKelas.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Materi Pokok">
              <TextAreaInput value={materi} onChange={(e) => setMateri(e.target.value)} placeholder="Contoh: Operasi hitung bilangan bulat" />
            </Field>
            <Field label="Tujuan Pembelajaran">
              <TextAreaInput value={tujuan} onChange={(e) => setTujuan(e.target.value)} placeholder="Contoh: Siswa mampu menyelesaikan operasi campuran bilangan bulat" />
            </Field>
            <Field label="Catatan Guru / Refleksi">
              <TextAreaInput value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan tambahan, kendala, atau refleksi pembelajaran..." />
            </Field>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">
              Absensi Siswa {siswaKelas.length > 0 && <span className="text-sm font-normal text-slate-500">({siswaKelas.length} siswa)</span>}
            </h2>
          </div>
          {siswaKelas.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Pilih kelas terlebih dahulu untuk menampilkan daftar siswa.
            </p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setSemua('H')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-200"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Semua Hadir
                </button>
                <span className="text-xs text-slate-400 self-center">H=Hadir S=Sakit I=Izin A=Alpa</span>
              </div>
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {siswaKelas.map((s, idx) => {
                  const st = absensi[s.id] || 'H';
                  return (
                    <div key={s.id} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-2">
                      <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">{idx + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{s.nama}</span>
                      <div className="flex shrink-0 gap-1">
                        {STATUS_ABSEN.map((k) => (
                          <button
                            key={k}
                            title={STATUS_ABSEN_LABEL[k]}
                            onClick={() => setAbsensi((lama) => ({ ...lama, [s.id]: k }))}
                            className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${
                              st === k ? WARNA_ABSEN[k] : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="sticky bottom-16 z-30 mt-4 flex gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <Button varian="sekunder" onClick={onSelesai} className="flex-1 sm:flex-none sm:px-8">
          Batal
        </Button>
        <Button onClick={simpan} loading={menyimpan} className="flex-1 sm:flex-none sm:px-10">
          <Save className="h-4 w-4" /> {modeEdit ? 'Simpan Perubahan' : 'Simpan Jurnal'}
        </Button>
      </div>
    </div>
  );
}
