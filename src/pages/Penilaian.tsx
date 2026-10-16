import { useEffect, useMemo, useState } from 'react';
import { FileDown, Pencil, Save } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState, Field, Modal, PageHeader, SelectInput, TextInput } from '../components/ui';
import { savePenilaian } from '../services/gasApi';
import { hitungNA, newId, toNilai, todayYMD, unduhCsv } from '../utils/format';
import type { PenilaianItem } from '../types';
import type { PageProps } from './PageProps';

export default function Penilaian({ db, apiUrl, refresh, toast }: PageProps) {
  const [kelasId, setKelasId] = useState('');
  const [mapelId, setMapelId] = useState('');
  const [rows, setRows] = useState<PenilaianItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [pendingPindah, setPendingPindah] = useState<{ kelasId: string; mapelId: string } | null>(null);

  const daftarKelas = useMemo(() => [...db.kelas].sort((a, b) => a.nama.localeCompare(b.nama)), [db.kelas]);
  const daftarMapel = useMemo(() => [...db.mapel].sort((a, b) => a.nama.localeCompare(b.nama)), [db.mapel]);

  // Muat baris nilai untuk pasangan (kelas, mapel): gabung data tersimpan + siswa aktif
  const muatBaris = (kId: string, mId: string) => {
    if (!kId || !mId) {
      setRows([]);
      setDirty(false);
      return;
    }
    const kelas = db.kelas.find((k) => k.id === kId);
    const mapel = db.mapel.find((m) => m.id === mId);
    const tersimpan = db.penilaian.filter((p) => p.kelasId === kId && p.mapelId === mId);
    const siswa = db.siswa
      .filter((s) => s.kelasId === kId && s.statusAktif)
      .sort((a, b) => a.nama.localeCompare(b.nama));
    const gabung: PenilaianItem[] = siswa.map((s) => {
      const ada = tersimpan.find((t) => t.siswaId === s.id);
      if (ada) return { ...ada, ph: [...ada.ph] };
      return {
        id: '',
        kelasId: kId,
        kelasNama: kelas?.nama || '',
        mapelId: mId,
        mapelNama: mapel?.nama || '',
        siswaId: s.id,
        siswaNama: s.nama,
        ph: Array(10).fill(0),
        pts: 0, pas: 0, ktr: 0, sikap: 0, na: 0,
        tahunPelajaran: db.pengaturan.tahunPelajaran,
        diubahPada: '',
      };
    });
    setRows(gabung);
    setDirty(false);
  };

  // Muat ulang saat db berubah (mis. setelah simpan) — hanya jika tidak sedang mengedit
  useEffect(() => {
    if (kelasId && mapelId && !dirty && editIdx === null) muatBaris(kelasId, mapelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db.penilaian]);

  const mintaPindah = (kId: string, mId: string) => {
    if (dirty) {
      setPendingPindah({ kelasId: kId, mapelId: mId });
    } else {
      setKelasId(kId);
      setMapelId(mId);
      muatBaris(kId, mId);
    }
  };

  const terapkanPindah = () => {
    if (!pendingPindah) return;
    setKelasId(pendingPindah.kelasId);
    setMapelId(pendingPindah.mapelId);
    muatBaris(pendingPindah.kelasId, pendingPindah.mapelId);
    setPendingPindah(null);
  };

  const bobot = db.pengaturan;
  const naUntuk = (r: PenilaianItem) => hitungNA(r.ph, r.pts, r.pas, r.ktr, r.sikap, bobot);

  const simpanSemua = async () => {
    if (menyimpan || rows.length === 0) return;
    setMenyimpan(true);
    try {
      const payload = rows.map((r) => ({ ...r, na: naUntuk(r) }));
      const res = await savePenilaian(apiUrl, payload);
      if (res.success) {
        toast('sukses', `Nilai ${rows.length} siswa berhasil disimpan.`);
        setDirty(false);
        await refresh();
      } else {
        toast('error', res.error || 'Gagal menyimpan nilai.');
      }
    } catch {
      toast('error', 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setMenyimpan(false);
    }
  };

  const eksporCsv = () => {
    const k = daftarKelas.find((x) => x.id === kelasId);
    const m = daftarMapel.find((x) => x.id === mapelId);
    unduhCsv(
      `nilai-${k?.nama || ''}-${m?.nama || ''}-${todayYMD()}`,
      ['No', 'Nama Siswa', 'PH1', 'PH2', 'PH3', 'PH4', 'PH5', 'PH6', 'PH7', 'PH8', 'PH9', 'PH10', 'PTS', 'PAS', 'KTR', 'Sikap', 'NA'],
      rows.map((r, i) => [i + 1, r.siswaNama, ...r.ph, r.pts, r.pas, r.ktr, r.sikap, naUntuk(r)])
    );
  };

  const siap = kelasId && mapelId;

  return (
    <div>
      <PageHeader
        judul="Rubrik Penilaian"
        subjudul={`Bobot: PH ${bobot.bobotPH}% • PTS ${bobot.bobotPTS}% • PAS ${bobot.bobotPAS}% • KTR ${bobot.bobotKTR}% • Sikap ${bobot.bobotSikap}%`}
        aksi={
          siap && rows.length > 0 ? (
            <>
              <Button varian="hijau" kecil onClick={eksporCsv}>
                <FileDown className="h-4 w-4" /> Excel
              </Button>
              <Button kecil onClick={simpanSemua} loading={menyimpan} disabled={!dirty}>
                <Save className="h-4 w-4" /> Simpan Nilai
              </Button>
            </>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kelas">
            <SelectInput value={kelasId} onChange={(e) => mintaPindah(e.target.value, mapelId)}>
              <option value="">— Pilih Kelas —</option>
              {daftarKelas.map((k) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Mata Pelajaran">
            <SelectInput value={mapelId} onChange={(e) => mintaPindah(kelasId, e.target.value)}>
              <option value="">— Pilih Mapel —</option>
              {daftarMapel.map((m) => (
                <option key={m.id} value={m.id}>{m.nama}</option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Card>

      {!siap ? (
        <EmptyState judul="Pilih kelas dan mata pelajaran" subjudul="Daftar siswa dan kolom nilai akan muncul di sini." />
      ) : rows.length === 0 ? (
        <EmptyState judul="Tidak ada siswa aktif di kelas ini" subjudul="Tambahkan siswa di menu Kelola Data." />
      ) : (
        <Card className="!p-0 overflow-hidden">
          {dirty && (
            <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
              ⚠ Ada perubahan belum disimpan. Klik "Simpan Nilai" untuk menyimpan ke spreadsheet.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3 text-center">Rata PH</th>
                  <th className="px-4 py-3 text-center">NA</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => {
                  const terisi = r.ph.filter((n) => n > 0);
                  const rata = terisi.length ? Math.round((terisi.reduce((a, b) => a + b, 0) / terisi.length) * 10) / 10 : 0;
                  const na = naUntuk(r);
                  return (
                    <tr key={r.siswaId || i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{r.siswaNama}</td>
                      <td className="px-4 py-2.5 text-center">{rata || '-'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${na >= 75 ? 'bg-emerald-100 text-emerald-700' : na >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {na}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => setEditIdx(i)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-200"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Isi Nilai
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal isi nilai per siswa */}
      {editIdx !== null && rows[editIdx] && (
        <ModalNilai
          row={rows[editIdx]}
          bobot={bobot}
          onTutup={() => setEditIdx(null)}
          onSimpan={(baru) => {
            setRows((lama) => lama.map((r, i) => (i === editIdx ? { ...baru, id: r.id || baru.id } : r)));
            setDirty(true);
            setEditIdx(null);
          }}
        />
      )}

      {/* Konfirmasi buang perubahan */}
      {pendingPindah && (
        <ConfirmDialog
          judul="Buang perubahan?"
          pesan="Ada nilai yang belum disimpan. Pindah kelas/mapel akan membuang perubahan tersebut."
          teksYa="Ya, Buang"
          onYa={terapkanPindah}
          onBatal={() => setPendingPindah(null)}
        />
      )}
    </div>
  );
}

function ModalNilai({
  row,
  bobot,
  onTutup,
  onSimpan,
}: {
  row: PenilaianItem;
  bobot: { bobotPH: number; bobotPTS: number; bobotPAS: number; bobotKTR: number; bobotSikap: number };
  onTutup: () => void;
  onSimpan: (r: PenilaianItem) => void;
}) {
  const [ph, setPh] = useState<number[]>(() => [...row.ph]);
  const [pts, setPts] = useState(String(row.pts || ''));
  const [pas, setPas] = useState(String(row.pas || ''));
  const [ktr, setKtr] = useState(String(row.ktr || ''));
  const [sikap, setSikap] = useState(String(row.sikap || ''));

  const na = hitungNA(ph, toNilai(pts), toNilai(pas), toNilai(ktr), toNilai(sikap), bobot);

  const setPhIdx = (i: number, v: string) => {
    const n = toNilai(v);
    setPh((lama) => lama.map((x, j) => (j === i ? n : x)));
  };

  const simpan = () => {
    onSimpan({
      ...row,
      id: row.id || newId('NL'),
      ph: ph.map(toNilai),
      pts: toNilai(pts),
      pas: toNilai(pas),
      ktr: toNilai(ktr),
      sikap: toNilai(sikap),
      na,
    });
  };

  return (
    <Modal judul={`Nilai — ${row.siswaNama}`} onTutup={onTutup} lebar="max-w-xl">
      <Field label="Penilaian Harian (PH 1–10)">
        <div className="grid grid-cols-5 gap-2">
          {ph.map((n, i) => (
            <div key={i}>
              <span className="mb-1 block text-center text-[11px] font-semibold text-slate-400">PH{i + 1}</span>
              <TextInput
                type="number"
                min={0}
                max={100}
                value={n || ''}
                placeholder="0"
                onChange={(e) => setPhIdx(i, e.target.value)}
                className="text-center"
              />
            </div>
          ))}
        </div>
      </Field>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="PTS">
          <TextInput type="number" min={0} max={100} value={pts} placeholder="0" onChange={(e) => setPts(e.target.value)} className="text-center" />
        </Field>
        <Field label="PAS">
          <TextInput type="number" min={0} max={100} value={pas} placeholder="0" onChange={(e) => setPas(e.target.value)} className="text-center" />
        </Field>
        <Field label="KTR">
          <TextInput type="number" min={0} max={100} value={ktr} placeholder="0" onChange={(e) => setKtr(e.target.value)} className="text-center" />
        </Field>
        <Field label="Sikap">
          <TextInput type="number" min={0} max={100} value={sikap} placeholder="0" onChange={(e) => setSikap(e.target.value)} className="text-center" />
        </Field>
      </div>
      <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center">
        <p className="text-xs font-semibold uppercase text-emerald-600">Nilai Akhir (otomatis)</p>
        <p className="text-3xl font-bold text-emerald-700">{na}</p>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button varian="sekunder" onClick={onTutup}>Batal</Button>
        <Button onClick={simpan}><Save className="h-4 w-4" /> Simpan ke Daftar</Button>
      </div>
    </Modal>
  );
}
