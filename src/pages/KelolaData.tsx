import { useMemo, useState } from 'react';
import { FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, SelectInput, TextInput } from '../components/ui';
import ExcelUploadModal from '../components/ExcelUploadModal';
import { deleteGuru, deleteKelas, deleteMapel, deleteSiswa, saveGuru, saveKelas, saveMapel, saveSiswa } from '../services/gasApi';
import type { TemplateKind } from '../utils/excel';
import type { GuruItem, KelasItem, MapelItem, SiswaItem } from '../types';
import type { ToastMsg } from '../types';
import type { PageProps } from './PageProps';

interface SubProps {
  db: PageProps['db'];
  apiUrl: string;
  refresh: () => Promise<void>;
  toast: (tipe: ToastMsg['tipe'], pesan: string) => void;
}

type TabKey = 'guru' | 'mapel' | 'kelas' | 'siswa';

export default function KelolaData({ db, apiUrl, refresh, toast }: PageProps) {
  const [tab, setTab] = useState<TabKey>('guru');
  const [filterKelas, setFilterKelas] = useState('');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'guru', label: 'Guru' },
    { key: 'mapel', label: 'Mapel' },
    { key: 'kelas', label: 'Kelas' },
    { key: 'siswa', label: 'Siswa' },
  ];

  return (
    <div>
      <PageHeader judul="Kelola Data" subjudul="Data guru, mata pelajaran, kelas, dan siswa" />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
              tab === t.key ? 'bg-emerald-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'guru' && <TabGuru db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />}
      {tab === 'mapel' && <TabMapel db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />}
      {tab === 'kelas' && <TabKelas db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />}
      {tab === 'siswa' && <TabSiswa db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} filterKelas={filterKelas} setFilterKelas={setFilterKelas} />}
    </div>
  );
}

// ---------- util kecil ----------
function useCrud<T extends { id: string }>() {
  const [edit, setEdit] = useState<T | null>(null);
  const [tambah, setTambah] = useState(false);
  const [hapus, setHapus] = useState<T | null>(null);
  const [proses, setProses] = useState(false);
  return { edit, setEdit, tambah, setTambah, hapus, setHapus, proses, setProses };
}

function BarisAksi({ onEdit, onHapus }: { onEdit: () => void; onHapus: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button title="Edit" onClick={onEdit} className="rounded-lg p-2 text-amber-600 hover:bg-amber-50">
        <Pencil className="h-4 w-4" />
      </button>
      <button title="Hapus" onClick={onHapus} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Tombol Template & Upload Excel — dipakai di semua tab. */
function TombolImpor({ kind, db, apiUrl, refresh, toast }: SubProps & { kind: TemplateKind }) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <Button varian="sekunder" kecil onClick={() => setBuka(true)}>
        <FileUp className="h-4 w-4" /> Template & Upload
      </Button>
      {buka && (
        <ExcelUploadModal
          kind={kind}
          db={db}
          apiUrl={apiUrl}
          toast={toast}
          onTutup={() => setBuka(false)}
          onSelesai={async () => {
            await refresh();
            setBuka(false);
          }}
        />
      )}
    </>
  );
}

interface SubProps {
  db: PageProps['db'];
  apiUrl: string;
  refresh: () => Promise<void>;
  toast: (tipe: ToastMsg['tipe'], pesan: string) => void;
}

// ================= GURU =================
function TabGuru({ db, apiUrl, refresh, toast }: SubProps) {
  const c = useCrud<GuruItem>();
  const [nama, setNama] = useState('');
  const [nip, setNip] = useState('');
  const [mapel, setMapel] = useState('');
  const [aktif, setAktif] = useState(true);
  const [err, setErr] = useState('');

  const bukaTambah = () => { setNama(''); setNip(''); setMapel(''); setAktif(true); setErr(''); c.setTambah(true); };
  const bukaEdit = (g: GuruItem) => { setNama(g.nama); setNip(g.nip); setMapel(g.mapel); setAktif(g.statusAktif); setErr(''); c.setEdit(g); };

  const simpan = async () => {
    if (!nama.trim()) { setErr('Nama guru wajib diisi.'); return; }
    c.setProses(true);
    try {
      const item: GuruItem = {
        id: c.edit?.id || '',
        nama: nama.trim(), nip: nip.trim(), mapel: mapel.trim(), statusAktif: aktif,
      };
      const res = await saveGuru(apiUrl, item);
      if (res.success) {
        toast('sukses', 'Data guru berhasil disimpan.');
        c.setTambah(false); c.setEdit(null);
        await refresh();
      } else toast('error', res.error || 'Gagal menyimpan.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); }
  };

  const hapus = async () => {
    if (!c.hapus) return;
    c.setProses(true);
    try {
      const res = await deleteGuru(apiUrl, c.hapus.id);
      if (res.success) { toast('sukses', 'Data guru dihapus.'); await refresh(); }
      else toast('error', res.error || 'Gagal menghapus.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); c.setHapus(null); }
  };

  const daftar = useMemo(() => [...db.guru].sort((a, b) => a.nama.localeCompare(b.nama)), [db.guru]);

  return (
    <>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <TombolImpor kind="guru" db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />
        <Button kecil onClick={bukaTambah}><Plus className="h-4 w-4" /> Tambah Guru</Button>
      </div>
      {daftar.length === 0 ? <EmptyState judul="Belum ada data guru" /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">NIP</th><th className="px-4 py-3">Mapel</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{g.nama}</td>
                    <td className="px-4 py-2.5 text-slate-500">{g.nip || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-500">{g.mapel || '-'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${g.statusAktif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {g.statusAktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><BarisAksi onEdit={() => bukaEdit(g)} onHapus={() => c.setHapus(g)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {(c.tambah || c.edit) && (
        <Modal judul={c.edit ? 'Edit Guru' : 'Tambah Guru'} onTutup={() => { c.setTambah(false); c.setEdit(null); }}>
          <div className="space-y-3">
            <Field label="Nama Lengkap" error={err}>
              <TextInput value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama guru" />
            </Field>
            <Field label="NIP (opsional)">
              <TextInput value={nip} onChange={(e) => setNip(e.target.value)} placeholder="NIP" />
            </Field>
            <Field label="Mata Pelajaran (opsional)">
              <TextInput value={mapel} onChange={(e) => setMapel(e.target.value)} placeholder="Contoh: Matematika" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
              Guru aktif (tampil di pilihan jurnal)
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button varian="sekunder" onClick={() => { c.setTambah(false); c.setEdit(null); }}>Batal</Button>
              <Button onClick={simpan} loading={c.proses}>Simpan</Button>
            </div>
          </div>
        </Modal>
      )}
      {c.hapus && (
        <ConfirmDialog judul="Hapus Guru?" pesan={`"${c.hapus.nama}" akan dihapus dari daftar guru.`}
          onYa={hapus} onBatal={() => c.setHapus(null)} loading={c.proses} />
      )}
    </>
  );
}

// ================= MAPEL =================
function TabMapel({ db, apiUrl, refresh, toast }: SubProps) {
  const c = useCrud<MapelItem>();
  const [nama, setNama] = useState('');
  const [kelompok, setKelompok] = useState('');
  const [err, setErr] = useState('');

  const bukaTambah = () => { setNama(''); setKelompok(''); setErr(''); c.setTambah(true); };
  const bukaEdit = (m: MapelItem) => { setNama(m.nama); setKelompok(m.kelompok); setErr(''); c.setEdit(m); };

  const simpan = async () => {
    if (!nama.trim()) { setErr('Nama mapel wajib diisi.'); return; }
    c.setProses(true);
    try {
      const res = await saveMapel(apiUrl, { id: c.edit?.id || '', nama: nama.trim(), kelompok: kelompok.trim() });
      if (res.success) { toast('sukses', 'Data mapel berhasil disimpan.'); c.setTambah(false); c.setEdit(null); await refresh(); }
      else toast('error', res.error || 'Gagal menyimpan.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); }
  };

  const hapus = async () => {
    if (!c.hapus) return;
    c.setProses(true);
    try {
      const res = await deleteMapel(apiUrl, c.hapus.id);
      if (res.success) { toast('sukses', 'Data mapel dihapus.'); await refresh(); }
      else toast('error', res.error || 'Gagal menghapus.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); c.setHapus(null); }
  };

  const daftar = useMemo(() => [...db.mapel].sort((a, b) => a.nama.localeCompare(b.nama)), [db.mapel]);

  return (
    <>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <TombolImpor kind="mapel" db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />
        <Button kecil onClick={bukaTambah}><Plus className="h-4 w-4" /> Tambah Mapel</Button>
      </div>
      {daftar.length === 0 ? <EmptyState judul="Belum ada data mapel" /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Nama Mapel</th><th className="px-4 py-3">Kelompok</th><th className="px-4 py-3 text-right">Aksi</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{m.nama}</td>
                    <td className="px-4 py-2.5 text-slate-500">{m.kelompok || '-'}</td>
                    <td className="px-4 py-2.5"><BarisAksi onEdit={() => bukaEdit(m)} onHapus={() => c.setHapus(m)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {(c.tambah || c.edit) && (
        <Modal judul={c.edit ? 'Edit Mapel' : 'Tambah Mapel'} onTutup={() => { c.setTambah(false); c.setEdit(null); }}>
          <div className="space-y-3">
            <Field label="Nama Mata Pelajaran" error={err}>
              <TextInput value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: Matematika" />
            </Field>
            <Field label="Kelompok (opsional)">
              <TextInput value={kelompok} onChange={(e) => setKelompok(e.target.value)} placeholder="Contoh: A / B / Muatan Lokal" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button varian="sekunder" onClick={() => { c.setTambah(false); c.setEdit(null); }}>Batal</Button>
              <Button onClick={simpan} loading={c.proses}>Simpan</Button>
            </div>
          </div>
        </Modal>
      )}
      {c.hapus && (
        <ConfirmDialog judul="Hapus Mapel?" pesan={`"${c.hapus.nama}" akan dihapus dari daftar mapel.`}
          onYa={hapus} onBatal={() => c.setHapus(null)} loading={c.proses} />
      )}
    </>
  );
}

// ================= KELAS =================
function TabKelas({ db, apiUrl, refresh, toast }: SubProps) {
  const c = useCrud<KelasItem>();
  const [nama, setNama] = useState('');
  const [tingkat, setTingkat] = useState('');
  const [wali, setWali] = useState('');
  const [err, setErr] = useState('');

  const bukaTambah = () => { setNama(''); setTingkat(''); setWali(''); setErr(''); c.setTambah(true); };
  const bukaEdit = (k: KelasItem) => { setNama(k.nama); setTingkat(k.tingkat); setWali(k.waliKelas); setErr(''); c.setEdit(k); };

  const simpan = async () => {
    if (!nama.trim()) { setErr('Nama kelas wajib diisi.'); return; }
    c.setProses(true);
    try {
      const res = await saveKelas(apiUrl, { id: c.edit?.id || '', nama: nama.trim(), tingkat: tingkat.trim(), waliKelas: wali.trim() });
      if (res.success) { toast('sukses', 'Data kelas berhasil disimpan.'); c.setTambah(false); c.setEdit(null); await refresh(); }
      else toast('error', res.error || 'Gagal menyimpan.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); }
  };

  const hapus = async () => {
    if (!c.hapus) return;
    const jmlSiswa = db.siswa.filter((s) => s.kelasId === c.hapus!.id).length;
    if (jmlSiswa > 0) { toast('error', `Kelas masih memiliki ${jmlSiswa} siswa. Pindahkan/hapus dulu siswanya.`); c.setHapus(null); return; }
    c.setProses(true);
    try {
      const res = await deleteKelas(apiUrl, c.hapus.id);
      if (res.success) { toast('sukses', 'Data kelas dihapus.'); await refresh(); }
      else toast('error', res.error || 'Gagal menghapus.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); c.setHapus(null); }
  };

  const daftar = useMemo(() => [...db.kelas].sort((a, b) => a.nama.localeCompare(b.nama)), [db.kelas]);

  return (
    <>
      <div className="mb-3 flex flex-wrap justify-end gap-2">
        <TombolImpor kind="kelas" db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />
        <Button kecil onClick={bukaTambah}><Plus className="h-4 w-4" /> Tambah Kelas</Button>
      </div>
      {daftar.length === 0 ? <EmptyState judul="Belum ada data kelas" /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {daftar.map((k) => {
            const jml = db.siswa.filter((s) => s.kelasId === k.id && s.statusAktif).length;
            return (
              <Card key={k.id} className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{k.nama}</p>
                  <p className="text-xs text-slate-500">{k.tingkat || '—'} • {jml} siswa{jml !== 1 ? '' : ''}</p>
                  {k.waliKelas && <p className="text-xs text-slate-400">Wali: {k.waliKelas}</p>}
                </div>
                <BarisAksi onEdit={() => bukaEdit(k)} onHapus={() => c.setHapus(k)} />
              </Card>
            );
          })}
        </div>
      )}
      {(c.tambah || c.edit) && (
        <Modal judul={c.edit ? 'Edit Kelas' : 'Tambah Kelas'} onTutup={() => { c.setTambah(false); c.setEdit(null); }}>
          <div className="space-y-3">
            <Field label="Nama Kelas" error={err}>
              <TextInput value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Contoh: 7A" />
            </Field>
            <Field label="Tingkat (opsional)">
              <TextInput value={tingkat} onChange={(e) => setTingkat(e.target.value)} placeholder="Contoh: VII" />
            </Field>
            <Field label="Wali Kelas (opsional)">
              <TextInput value={wali} onChange={(e) => setWali(e.target.value)} placeholder="Nama wali kelas" />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button varian="sekunder" onClick={() => { c.setTambah(false); c.setEdit(null); }}>Batal</Button>
              <Button onClick={simpan} loading={c.proses}>Simpan</Button>
            </div>
          </div>
        </Modal>
      )}
      {c.hapus && (
        <ConfirmDialog judul="Hapus Kelas?" pesan={`Kelas "${c.hapus.nama}" akan dihapus.`}
          onYa={hapus} onBatal={() => c.setHapus(null)} loading={c.proses} />
      )}
    </>
  );
}

// ================= SISWA =================
function TabSiswa({ db, apiUrl, refresh, toast, filterKelas, setFilterKelas }: SubProps & { filterKelas: string; setFilterKelas: (v: string) => void }) {
  const c = useCrud<SiswaItem>();
  const [nama, setNama] = useState('');
  const [nis, setNis] = useState('');
  const [kelasId, setKelasId] = useState('');
  const [jk, setJk] = useState<'L' | 'P'>('L');
  const [aktif, setAktif] = useState(true);
  const [err, setErr] = useState('');

  const daftarKelas = useMemo(() => [...db.kelas].sort((a, b) => a.nama.localeCompare(b.nama)), [db.kelas]);
  const daftar = useMemo(
    () =>
      db.siswa
        .filter((s) => !filterKelas || s.kelasId === filterKelas)
        .sort((a, b) => a.nama.localeCompare(b.nama)),
    [db.siswa, filterKelas]
  );

  const bukaTambah = () => { setNama(''); setNis(''); setKelasId(filterKelas); setJk('L'); setAktif(true); setErr(''); c.setTambah(true); };
  const bukaEdit = (s: SiswaItem) => { setNama(s.nama); setNis(s.nis); setKelasId(s.kelasId); setJk(s.jenisKelamin); setAktif(s.statusAktif); setErr(''); c.setEdit(s); };

  const simpan = async () => {
    if (!nama.trim()) { setErr('Nama siswa wajib diisi.'); return; }
    if (!kelasId) { setErr('Pilih kelas siswa.'); return; }
    c.setProses(true);
    try {
      const kelas = db.kelas.find((k) => k.id === kelasId);
      const res = await saveSiswa(apiUrl, {
        id: c.edit?.id || '', nama: nama.trim(), nis: nis.trim(),
        kelasId, kelasNama: kelas?.nama || '', jenisKelamin: jk, statusAktif: aktif,
      });
      if (res.success) { toast('sukses', 'Data siswa berhasil disimpan.'); c.setTambah(false); c.setEdit(null); await refresh(); }
      else toast('error', res.error || 'Gagal menyimpan.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); }
  };

  const hapus = async () => {
    if (!c.hapus) return;
    c.setProses(true);
    try {
      const res = await deleteSiswa(apiUrl, c.hapus.id);
      if (res.success) { toast('sukses', 'Data siswa dihapus.'); await refresh(); }
      else toast('error', res.error || 'Gagal menghapus.');
    } catch { toast('error', 'Terjadi kesalahan.'); } finally { c.setProses(false); c.setHapus(null); }
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <SelectInput value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)} className="!w-auto">
          <option value="">Semua Kelas</option>
          {daftarKelas.map((k) => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </SelectInput>
        <div className="flex flex-wrap gap-2">
          <TombolImpor kind="siswa" db={db} apiUrl={apiUrl} refresh={refresh} toast={toast} />
          <Button kecil onClick={bukaTambah}><Plus className="h-4 w-4" /> Tambah Siswa</Button>
        </div>
      </div>
      {daftar.length === 0 ? <EmptyState judul="Belum ada data siswa" subjudul="Pilih kelas lain atau tambah siswa baru." /> : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">NIS</th><th className="px-4 py-3">Kelas</th><th className="px-4 py-3">L/P</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Aksi</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {daftar.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium">{s.nama}</td>
                    <td className="px-4 py-2.5 text-slate-500">{s.nis || '-'}</td>
                    <td className="px-4 py-2.5">{s.kelasNama}</td>
                    <td className="px-4 py-2.5">{s.jenisKelamin}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${s.statusAktif ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {s.statusAktif ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5"><BarisAksi onEdit={() => bukaEdit(s)} onHapus={() => c.setHapus(s)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400">{daftar.length} siswa ditampilkan</p>
        </Card>
      )}
      {(c.tambah || c.edit) && (
        <Modal judul={c.edit ? 'Edit Siswa' : 'Tambah Siswa'} onTutup={() => { c.setTambah(false); c.setEdit(null); }}>
          <div className="space-y-3">
            <Field label="Nama Lengkap" error={err}>
              <TextInput value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama siswa" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="NIS (opsional)">
                <TextInput value={nis} onChange={(e) => setNis(e.target.value)} placeholder="Nomor induk" />
              </Field>
              <Field label="Jenis Kelamin">
                <SelectInput value={jk} onChange={(e) => setJk(e.target.value as 'L' | 'P')}>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </SelectInput>
              </Field>
            </div>
            <Field label="Kelas">
              <SelectInput value={kelasId} onChange={(e) => setKelasId(e.target.value)}>
                <option value="">— Pilih Kelas —</option>
                {daftarKelas.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </SelectInput>
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4 rounded accent-emerald-600" />
              Siswa aktif
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button varian="sekunder" onClick={() => { c.setTambah(false); c.setEdit(null); }}>Batal</Button>
              <Button onClick={simpan} loading={c.proses}>Simpan</Button>
            </div>
          </div>
        </Modal>
      )}
      {c.hapus && (
        <ConfirmDialog judul="Hapus Siswa?" pesan={`"${c.hapus.nama}" akan dihapus dari daftar siswa.`}
          onYa={hapus} onBatal={() => c.setHapus(null)} loading={c.proses} />
      )}
    </>
  );
}
