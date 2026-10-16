import { useRef, useState } from 'react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { Button, Card, Field, PageHeader, TextInput } from '../components/ui';
import { saveSettings, uploadLogo } from '../services/gasApi';
import type { PageProps } from './PageProps';

export default function Pengaturan({ db, apiUrl, refresh, toast }: PageProps) {
  const p = db.pengaturan;
  const [namaSekolah, setNamaSekolah] = useState(p.namaSekolah);
  const [npsn, setNpsn] = useState(p.npsn);
  const [alamat, setAlamat] = useState(p.alamat);
  const [tahunPelajaran, setTahunPelajaran] = useState(p.tahunPelajaran);
  const [kepalaSekolah, setKepalaSekolah] = useState(p.kepalaSekolah);
  const [logoUrl, setLogoUrl] = useState(p.logoUrl || '');
  const [bobotPH, setBobotPH] = useState(String(p.bobotPH));
  const [bobotPTS, setBobotPTS] = useState(String(p.bobotPTS));
  const [bobotPAS, setBobotPAS] = useState(String(p.bobotPAS));
  const [bobotKTR, setBobotKTR] = useState(String(p.bobotKTR));
  const [bobotSikap, setBobotSikap] = useState(String(p.bobotSikap));
  const [err, setErr] = useState('');
  const [menyimpan, setMenyimpan] = useState(false);
  const [mengunggah, setMengunggah] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const num = (v: string) => {
    const n = parseFloat(v.replace(',', '.'));
    return Number.isNaN(n) ? 0 : n;
  };
  const total = num(bobotPH) + num(bobotPTS) + num(bobotPAS) + num(bobotKTR) + num(bobotSikap);

  const bacaFile = (file: File): Promise<{ base64: string; mime: string }> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error('Gagal membaca file.'));
      r.onload = () => {
        const dataUrl = String(r.result || '');
        const [head, base64] = dataUrl.split(',');
        const mime = (head.match(/data:(.*?);/) || [])[1] || file.type || 'image/png';
        resolve({ base64: base64 || '', mime });
      };
      r.readAsDataURL(file);
    });

  const unggahLogo = async (file: File | undefined) => {
    if (!file || mengunggah) return;
    if (!file.type.startsWith('image/')) {
      toast('error', 'File harus berupa gambar (PNG/JPG).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('error', 'Ukuran gambar maksimal 2 MB.');
      return;
    }
    setMengunggah(true);
    try {
      const { base64, mime } = await bacaFile(file);
      const up = await uploadLogo(apiUrl, { fileName: file.name, base64Data: base64, mimeType: mime });
      if (!up.success || !up.data?.url) {
        toast('error', up.error || up.message || 'Gagal mengunggah logo.');
        return;
      }
      // Simpan URL logo ke pengaturan
      const simpan = await saveSettings(apiUrl, { ...db.pengaturan, logoUrl: up.data.url });
      if (simpan.success) {
        setLogoUrl(up.data.url);
        toast('sukses', 'Logo berhasil diunggah dan disimpan.');
        await refresh();
      } else {
        toast('error', 'Logo terunggah, tetapi gagal menyimpan ke pengaturan.');
      }
    } catch {
      toast('error', 'Terjadi kesalahan saat mengunggah logo.');
    } finally {
      setMengunggah(false);
    }
  };

  const hapusLogo = async () => {
    setMenyimpan(true);
    try {
      const res = await saveSettings(apiUrl, { ...db.pengaturan, logoUrl: '' });
      if (res.success) {
        setLogoUrl('');
        toast('sukses', 'Logo dihapus.');
        await refresh();
      } else {
        toast('error', res.error || 'Gagal menghapus logo.');
      }
    } catch {
      toast('error', 'Terjadi kesalahan.');
    } finally {
      setMenyimpan(false);
    }
  };

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
        logoUrl: logoUrl.trim(),
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

      {/* Logo sekolah */}
      <Card className="mt-4">
        <h2 className="mb-1 font-bold text-slate-900">Logo Sekolah</h2>
        <p className="mb-4 text-xs text-slate-500">
          Logo tampil di beranda dan kop laporan cetak. Format PNG/JPG, maksimal 2 MB.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo sekolah" className="h-full w-full object-contain" />
            ) : (
              <span className="px-2 text-center text-xs text-slate-400">Belum ada logo</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button varian="sekunder" kecil onClick={() => fileRef.current?.click()} loading={mengunggah}>
              <ImagePlus className="h-4 w-4" /> {logoUrl ? 'Ganti Logo' : 'Unggah Logo'}
            </Button>
            {logoUrl && (
              <Button varian="bahaya" kecil onClick={hapusLogo} disabled={mengunggah || menyimpan}>
                <Trash2 className="h-4 w-4" /> Hapus
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(e) => {
                unggahLogo(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </div>
      </Card>

      <div className="mt-4">
        <Button onClick={simpan} loading={menyimpan} className="w-full sm:w-auto sm:px-10">
          <Save className="h-4 w-4" /> Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}
