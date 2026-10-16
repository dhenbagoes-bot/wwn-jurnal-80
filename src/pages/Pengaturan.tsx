import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button, Card, Field, PageHeader, TextInput } from '../components/ui';
import { saveSettings } from '../services/gasApi';
import type { PageProps } from './PageProps';

export default function Pengaturan({ db, apiUrl, refresh, toast }: PageProps) {
  const p = db.pengaturan;
  const [namaSekolah, setNamaSekolah] = useState(p.namaSekolah);
  const [npsn, setNpsn] = useState(p.npsn);
  const [alamat, setAlamat] = useState(p.alamat);
  const [tahunPelajaran, setTahunPelajaran] = useState(p.tahunPelajaran);
  const [kepalaSekolah, setKepalaSekolah] = useState(p.kepalaSekolah);
  const [bobotPH, setBobotPH] = useState(String(p.bobotPH));
  const [bobotPTS, setBobotPTS] = useState(String(p.bobotPTS));
  const [bobotPAS, setBobotPAS] = useState(String(p.bobotPAS));
  const [bobotKTR, setBobotKTR] = useState(String(p.bobotKTR));
  const [bobotSikap, setBobotSikap] = useState(String(p.bobotSikap));
  const [err, setErr] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isNaN(n) ? 0 : n;
  };
  const total = num(bobotPH) + num(bobotPTS) + num(bobotPAS) + num(bobotKTR) + num(bobotSikap);

  const simpan = async () => {
    if (!namaSekolah.trim()) { setErr('Nama sekolah wajib diisi.'); return; }
    if (Math.abs(total - 100) > 0.001) { setErr(`Total bobot harus 100% (saat ini ${total}%).`); return; }
    setErr('');
    setMenyimpan(true);
    try {
      const res = await saveSettings(apiUrl, {
        namaSekolah: namaSekolah.trim(),
        npsn: npsn.trim(),
        alamat: alamat.trim(),
        tahunPelajaran: tahunPelajaran.trim(),
        kepalaSekolah: kepalaSekolah.trim(),
        bobotPH: num(bobotPH),
        bobotPTS: num(bobotPTS),
        bobotPAS: num(bobotPAS),
        bobotKTR: num(bobotKTR),
        bobotSikap: num(bobotSikap),
      });
      if (res.success) {
        toast('sukses', 'Pengaturan berhasil disimpan.');
        await refresh();
      } else {
        toast('error', res.error || 'Gagal menyimpan pengaturan.');
      }
    } catch {
      toast('error', 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div>
      <PageHeader judul="Pengaturan" subjudul="Identitas sekolah & bobot penilaian" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-bold text-slate-900">Identitas Sekolah</h2>
          <div className="space-y-3">
            <Field label="Nama Sekolah" error={err && !namaSekolah.trim() ? err : undefined}>
              <TextInput value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)} placeholder="Nama madrasah/sekolah" />
            </Field>
            <Field label="NPSN / NSM">
              <TextInput value={npsn} onChange={(e) => setNpsn(e.target.value)} placeholder="Nomor pokok sekolah" />
            </Field>
            <Field label="Alamat">
              <TextInput value={alamat} onChange={(e) => setAlamat(e.target.value)} placeholder="Alamat lengkap" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tahun Pelajaran">
                <TextInput value={tahunPelajaran} onChange={(e) => setTahunPelajaran(e.target.value)} placeholder="2026/2027" />
              </Field>
              <Field label="Kepala Madrasah">
                <TextInput value={kepalaSekolah} onChange={(e) => setKepalaSekolah(e.target.value)} placeholder="Nama kepala" />
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-1 font-bold text-slate-900">Bobot Penilaian</h2>
          <p className="mb-4 text-xs text-slate-500">
            Rumus Nilai Akhir: (Rata PH × bobot + PTS × bobot + PAS × bobot + KTR × bobot + Sikap × bobot) ÷ 100.
            Total bobot harus <b>100%</b>.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="PH (%)"><TextInput type="number" min={0} max={100} value={bobotPH} onChange={(e) => setBobotPH(e.target.value)} /></Field>
            <Field label="PTS (%)"><TextInput type="number" min={0} max={100} value={bobotPTS} onChange={(e) => setBobotPTS(e.target.value)} /></Field>
            <Field label="PAS (%)"><TextInput type="number" min={0} max={100} value={bobotPAS} onChange={(e) => setBobotPAS(e.target.value)} /></Field>
            <Field label="KTR (%)"><TextInput type="number" min={0} max={100} value={bobotKTR} onChange={(e) => setBobotKTR(e.target.value)} /></Field>
            <Field label="Sikap (%)"><TextInput type="number" min={0} max={100} value={bobotSikap} onChange={(e) => setBobotSikap(e.target.value)} /></Field>
            <div className={`flex items-end pb-1`}>
              <div className={`w-full rounded-xl px-3 py-2.5 text-center text-sm font-bold ${Math.abs(total - 100) < 0.001 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                Total: {total}%
              </div>
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </Card>
      </div>

      <div className="mt-4">
        <Button onClick={simpan} loading={menyimpan} className="w-full sm:w-auto sm:px-10">
          <Save className="h-4 w-4" /> Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}
