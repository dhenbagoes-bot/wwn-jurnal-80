import { useMemo, useState } from 'react';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, SelectInput, TextInput } from '../components/ui';
import { deleteJurnal } from '../services/gasApi';
import { filterJurnal, formatTanggalPendek, formatTanggalPanjang, hitungAbsensi, STATUS_ABSEN_LABEL, todayYMD } from '../utils/format';
import type { JurnalItem } from '../types';
import type { PageProps } from './PageProps';

interface Props extends PageProps {
  onEdit: (j: JurnalItem) => void;
}

export default function JurnalData({ db, apiUrl, refresh, toast, onEdit }: Props) {
  const [dari, setDari] = useState('');
  const [sampai, setSampai] = useState('');
  const [guruId, setGuruId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [cari, setCari] = useState('');
  const [detail, setDetail] = useState<JurnalItem | null>(null);
  const [hapus, setHapus] = useState<JurnalItem | null>(null);
  const [menghapus, setMenghapus] = useState(false);

  const hasil = useMemo(
    () => filterJurnal(db.jurnal, { dari, sampai, guruId, mapelId, kelasId, cari }),
    [db.jurnal, dari, sampai, guruId, mapelId, kelasId, cari]
  );

  const resetFilter = () => {
    setDari(''); setSampai(''); setGuruId(''); setMapelId(''); setKelasId(''); setCari('');
  };

  const konfirmasiHapus = async () => {
    if (!hapus || menghapus) return;
    setMenghapus(true);
    try {
      const res = await deleteJurnal(apiUrl, hapus.id);
      if (res.success) {
        toast('sukses', 'Jurnal berhasil dihapus.');
        await refresh();
      } else {
        toast('error', res.error || 'Gagal menghapus jurnal.');
      }
    } catch {
      toast('error', 'Terjadi kesalahan saat menghapus.');
    } finally {
      setMenghapus(false);
      setHapus(null);
    }
  };

  const adaFilter = dari || sampai || guruId || mapelId || kelasId || cari;

  return (
    <div>
      <PageHeader judul="Data Jurnal Mengajar" subjudul={`${hasil.length} jurnal ditemukan`} />

      <Card className="mb-4">
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
              <TextInput value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari materi, guru, catatan..." className="pl-9" />
            </div>
          </Field>
        </div>
        {adaFilter && (
          <button onClick={resetFilter} className="mt-3 text-sm font-semibold text-emerald-600 hover:underline">
            ✕ Bersihkan filter
          </button>
        )}
      </Card>

      {hasil.length === 0 ? (
        <EmptyState judul="Tidak ada jurnal ditemukan" subjudul="Ubah filter atau isi jurnal baru." />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Guru</th>
                  <th className="px-4 py-3">Mapel / Kelas</th>
                  <th className="px-4 py-3">Materi</th>
                  <th className="px-4 py-3">Absensi</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hasil.map((j) => {
                  const ab = hitungAbsensi(j.absensi);
                  return (
                    <tr key={j.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{formatTanggalPendek(j.tanggal)}</td>
                      <td className="px-4 py-3">{j.guruNama}</td>
                      <td className="px-4 py-3">{j.mapelNama} • {j.kelasNama}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-500">{j.materiPokok || '-'}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          H:{ab.H} S:{ab.S} I:{ab.I} A:{ab.A}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button title="Lihat detail" onClick={() => setDetail(j)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button title="Edit" onClick={() => onEdit(j)} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button title="Hapus" onClick={() => setHapus(j)} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Detail jurnal */}
      {detail && (
        <Modal judul="Detail Jurnal" onTutup={() => setDetail(null)} lebar="max-w-2xl">
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-emerald-700">{formatTanggalPanjang(detail.tanggal)}</p>
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
              <div><p className="text-xs text-slate-400">Guru</p><p className="font-semibold">{detail.guruNama}</p></div>
              <div><p className="text-xs text-slate-400">Mapel / Kelas</p><p className="font-semibold">{detail.mapelNama} • {detail.kelasNama}</p></div>
            </div>
            <div><p className="text-xs font-semibold uppercase text-slate-400">Materi Pokok</p><p className="mt-1 whitespace-pre-wrap">{detail.materiPokok || '-'}</p></div>
            <div><p className="text-xs font-semibold uppercase text-slate-400">Tujuan Pembelajaran</p><p className="mt-1 whitespace-pre-wrap">{detail.tujuanPembelajaran || '-'}</p></div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Absensi</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {Object.entries(detail.absensi).map(([sid, st]) => {
                  const nm = db.siswa.find((s) => s.id === sid)?.nama || sid;
                  return (
                    <span key={sid} className="rounded-lg bg-slate-100 px-2 py-1 text-xs" title={nm}>
                      {st} <span className="text-slate-400">•</span> {nm.split(' ').slice(0, 2).join(' ')}
                    </span>
                  );
                })}
                {Object.keys(detail.absensi).length === 0 && <span className="text-slate-400">-</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {(['H', 'S', 'I', 'A'] as const).map((k) => `${k}=${STATUS_ABSEN_LABEL[k]}`).join(' • ')}
              </p>
            </div>
            <div><p className="text-xs font-semibold uppercase text-slate-400">Catatan Guru</p><p className="mt-1 whitespace-pre-wrap">{detail.catatan || '-'}</p></div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button varian="sekunder" onClick={() => setDetail(null)}>Tutup</Button>
            <Button varian="kuning" onClick={() => { setDetail(null); onEdit(detail); }}>
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          </div>
        </Modal>
      )}

      {/* Konfirmasi hapus */}
      {hapus && (
        <ConfirmDialog
          judul="Hapus Jurnal?"
          pesan={`Jurnal ${hapus.mapelNama} kelas ${hapus.kelasNama} tanggal ${formatTanggalPendek(hapus.tanggal)} akan dihapus permanen dan tidak bisa dikembalikan.`}
          onYa={konfirmasiHapus}
          onBatal={() => setHapus(null)}
          loading={menghapus}
        />
      )}
    </div>
  );
}
