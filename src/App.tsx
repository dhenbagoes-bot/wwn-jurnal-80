import { useCallback, useEffect, useRef, useState } from 'react';
import { Layout } from './components/Layout';
import { LoadingBlock, Toasts } from './components/ui';
import { fetchAllData } from './services/gasApi';
import type { AppDatabase, DatabaseStatus, JurnalItem, PageKey, SchoolEntry, ToastMsg } from './types';
import Dashboard from './pages/Dashboard';
import JurnalForm from './pages/JurnalForm';
import JurnalData from './pages/JurnalData';
import Laporan from './pages/Laporan';
import Rekap from './pages/Rekap';
import Penilaian from './pages/Penilaian';
import KelolaData from './pages/KelolaData';
import Pengaturan from './pages/Pengaturan';
import Konfigurasi from './pages/Konfigurasi';
import type { PageProps } from './pages/PageProps';

const LS_SEKOLAH = 'wwn-jurnal-80:sekolah-aktif';
const LS_URL_PREFIX = 'wwn-jurnal-80:apiurl:';

const DB_KOSONG: AppDatabase = {
  pengaturan: {
    namaSekolah: '', npsn: '', alamat: '', tahunPelajaran: '', kepalaSekolah: '', logoUrl: '',
    bobotPH: 40, bobotPTS: 20, bobotPAS: 20, bobotKTR: 10, bobotSikap: 10,
  },
  guru: [], mapel: [], kelas: [], siswa: [], jurnal: [], penilaian: [],
};

function urlUntukSekolah(s: SchoolEntry): string {
  try {
    return localStorage.getItem(LS_URL_PREFIX + s.id) || s.apiUrl || '';
  } catch {
    return s.apiUrl || '';
  }
}

export default function App() {
  const [daftarSekolah, setDaftarSekolah] = useState<SchoolEntry[]>([]);
  const [sekolah, setSekolah] = useState<SchoolEntry | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [db, setDb] = useState<AppDatabase>(DB_KOSONG);
  const [database, setDatabase] = useState<DatabaseStatus | null>(null);
  const [memuatAwal, setMemuatAwal] = useState(true);
  const [menyegarkan, setMenyegarkan] = useState(false);
  const [galat, setGalat] = useState('');
  const [page, setPage] = useState<PageKey>('dashboard');
  const [editJurnal, setEditJurnal] = useState<JurnalItem | null>(null);
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const toastId = useRef(0);

  const toast = useCallback((tipe: ToastMsg['tipe'], pesan: string) => {
    const id = ++toastId.current;
    setToasts((lama) => [...lama.slice(-2), { id, tipe, pesan }]);
    setTimeout(() => {
      setToasts((lama) => lama.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const tutupToast = useCallback((id: number) => {
    setToasts((lama) => lama.filter((t) => t.id !== id));
  }, []);

  const muatData = useCallback(
    async (url: string, awal = false) => {
      if (!url) {
        setDb(DB_KOSONG);
        setDatabase(null);
        setGalat('Backend belum dikonfigurasi. Buka menu Konfigurasi untuk menghubungkan Google Spreadsheet.');
        if (awal) setMemuatAwal(false);
        return;
      }
      if (awal) setMemuatAwal(true);
      else setMenyegarkan(true);
      setGalat('');
      try {
        const res = await fetchAllData(url);
        if (res.success && res.data) {
          setDb({
            pengaturan: res.data.pengaturan,
            guru: res.data.guru,
            mapel: res.data.mapel,
            kelas: res.data.kelas,
            siswa: res.data.siswa,
            jurnal: res.data.jurnal,
            penilaian: res.data.penilaian,
          });
          setDatabase(res.data.database || null);
        } else {
          setGalat(res.error || 'Gagal memuat data. Periksa URL backend di menu Konfigurasi.');
        }
      } catch {
        setGalat('Tidak dapat menghubungi backend. Periksa koneksi internet & URL backend.');
      } finally {
        if (awal) setMemuatAwal(false);
        else setMenyegarkan(false);
      }
    },
    []
  );

  const refresh = useCallback(async () => {
    await muatData(apiUrl, false);
  }, [muatData, apiUrl]);

  // Muat daftar sekolah sekali saat aplikasi dibuka
  useEffect(() => {
    let batal = false;
    (async () => {
      let daftar: SchoolEntry[] = [];
      try {
        const res = await fetch('/schools.json');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) daftar = json;
        }
      } catch {
        daftar = [];
      }
      if (batal) return;
      setDaftarSekolah(daftar);

      // Pilih sekolah: ?school= > localStorage > pertama di daftar
      const param = new URLSearchParams(window.location.search).get('school');
      let pilih: SchoolEntry | null = null;
      if (param) pilih = daftar.find((s) => s.id === param) || null;
      if (!pilih) {
        try {
          const tersimpan = localStorage.getItem(LS_SEKOLAH);
          if (tersimpan) pilih = daftar.find((s) => s.id === tersimpan) || null;
        } catch { /* abaikan */ }
      }
      if (!pilih && daftar.length > 0) pilih = daftar[0];
      setSekolah(pilih);
      if (pilih) {
        setApiUrl(urlUntukSekolah(pilih));
        try { localStorage.setItem(LS_SEKOLAH, pilih.id); } catch { /* abaikan */ }
      } else {
        setMemuatAwal(false);
        setGalat('Belum ada sekolah terdaftar. Atur URL backend manual di menu Konfigurasi.');
      }
    })();
    return () => { batal = true; };
  }, []);

  // Muat data setiap kali apiUrl berubah
  useEffect(() => {
    if (sekolah) muatData(apiUrl, true);
  }, [apiUrl, sekolah, muatData]);

  const gantiSekolah = useCallback(
    (s: SchoolEntry) => {
      setSekolah(s);
      setPage('dashboard');
      setEditJurnal(null);
      setDb(DB_KOSONG);
      setDatabase(null);
      const url = urlUntukSekolah(s);
      setApiUrl(url);
      try {
        localStorage.setItem(LS_SEKOLAH, s.id);
        const u = new URL(window.location.href);
        u.searchParams.set('school', s.id);
        window.history.replaceState(null, '', u.toString());
      } catch { /* abaikan */ }
    },
    []
  );

  const simpanUrlManual = useCallback(
    (url: string) => {
      if (sekolah) {
        try { localStorage.setItem(LS_URL_PREFIX + sekolah.id, url); } catch { /* abaikan */ }
      }
      setApiUrl(url);
    },
    [sekolah]
  );

  const pindah = useCallback((p: PageKey) => {
    setPage(p);
    if (p !== 'jurnal-baru') setEditJurnal(null);
    window.scrollTo({ top: 0 });
  }, []);

  const mulaiEditJurnal = useCallback((j: JurnalItem) => {
    setEditJurnal(j);
    setPage('jurnal-baru');
    window.scrollTo({ top: 0 });
  }, []);

  const selesaiFormJurnal = useCallback(() => {
    setEditJurnal(null);
    setPage('jurnal-data');
    window.scrollTo({ top: 0 });
  }, []);

  const pageProps: PageProps = {
    db, apiUrl, refresh, toast, pindah,
  };

  const renderHalaman = () => {
    switch (page) {
      case 'dashboard':
        return <Dashboard {...pageProps} />;
      case 'jurnal-baru':
        return <JurnalForm {...pageProps} editData={editJurnal} onSelesai={selesaiFormJurnal} />;
      case 'jurnal-data':
        return <JurnalData {...pageProps} onEdit={mulaiEditJurnal} />;
      case 'laporan':
        return <Laporan {...pageProps} />;
      case 'rekap':
        return <Rekap {...pageProps} />;
      case 'penilaian':
        return <Penilaian {...pageProps} />;
      case 'kelola':
        return <KelolaData {...pageProps} />;
      case 'pengaturan':
        return <Pengaturan {...pageProps} />;
      case 'konfigurasi':
        return (
          <Konfigurasi
            {...pageProps}
            sekolah={sekolah}
            daftarSekolah={daftarSekolah}
            onGantiSekolah={gantiSekolah}
            onSimpanUrl={simpanUrlManual}
            database={database}
          />
        );
      default:
        return <Dashboard {...pageProps} />;
    }
  };

  return (
    <>
      <Layout
        page={page}
        onPindah={pindah}
        sekolah={sekolah}
        daftarSekolah={daftarSekolah}
        onGantiSekolah={gantiSekolah}
        terhubung={!!database?.connected && !galat}
        logoUrl={db.pengaturan.logoUrl}
      >
        {memuatAwal ? (
          <LoadingBlock teks="Memuat data dari Google Spreadsheet..." />
        ) : (
          <>
            {menyegarkan && (
              <p className="mb-3 text-center text-xs text-slate-400">Menyegarkan data...</p>
            )}
            {galat && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">⚠ {galat}</p>
                {page !== 'konfigurasi' && (
                  <button onClick={() => pindah('konfigurasi')} className="mt-2 font-bold text-emerald-700 hover:underline">
                    Buka menu Konfigurasi →
                  </button>
                )}
              </div>
            )}
            {renderHalaman()}
          </>
        )}
      </Layout>
      <Toasts daftar={toasts} onTutup={tutupToast} />
    </>
  );
}
