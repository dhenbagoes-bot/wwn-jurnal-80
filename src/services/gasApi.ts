import type {
  ApiResult,
  AppDatabase,
  DatabaseStatus,
  GuruItem,
  JurnalItem,
  KelasItem,
  MapelItem,
  Pengaturan,
  PenilaianItem,
  SiswaItem,
} from '../types';

// ============================================================
// Klien API Google Apps Script — pola sama seperti wwn-bel-80:
//  - GET  : ?action=... (baca data)
//  - POST : JSON { action, ... } dengan Content-Type text/plain
//          (menghindari preflight CORS di Apps Script)
// ============================================================

function validUrl(apiUrl: string): boolean {
  return !!apiUrl && apiUrl.trim().startsWith('http');
}

async function getAction<T>(apiUrl: string, action: string): Promise<ApiResult<T>> {
  if (!validUrl(apiUrl)) {
    return { success: false, message: 'URL backend belum dikonfigurasi.', error: 'URL backend belum dikonfigurasi.' };
  }
  try {
    const url = new URL(apiUrl.trim());
    url.searchParams.set('action', action);
    url.searchParams.set('_t', Date.now().toString());
    const res = await fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`Server merespons HTTP ${res.status}`);
    const json = await res.json();
    return {
      success: json.success !== false,
      message: json.message || 'OK',
      data: json.data as T,
      error: json.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kesalahan jaringan';
    return { success: false, message: 'Gagal menghubungi backend.', error: msg };
  }
}

async function postAction<T>(apiUrl: string, payload: Record<string, unknown>): Promise<ApiResult<T>> {
  if (!validUrl(apiUrl)) {
    return { success: false, message: 'URL backend belum dikonfigurasi.', error: 'URL backend belum dikonfigurasi.' };
  }
  try {
    const res = await fetch(apiUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Server merespons HTTP ${res.status}`);
    const json = await res.json();
    return {
      success: json.success !== false,
      message: json.message || 'Berhasil.',
      data: json.data as T,
      error: json.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kesalahan jaringan';
    return { success: false, message: 'Gagal mengirim data ke backend.', error: msg };
  }
}

// ---------- Koneksi & inisialisasi ----------

export async function pingBackend(apiUrl: string): Promise<ApiResult<{ version?: string }>> {
  return getAction(apiUrl, 'ping');
}

export async function initDatabase(apiUrl: string): Promise<ApiResult<DatabaseStatus>> {
  return postAction(apiUrl, { action: 'initDatabase' });
}

export async function fetchAllData(apiUrl: string): Promise<ApiResult<AppDatabase & { database: DatabaseStatus }>> {
  return getAction(apiUrl, 'getAllData');
}

// ---------- Pengaturan ----------

export async function saveSettings(apiUrl: string, pengaturan: Pengaturan): Promise<ApiResult<{ pengaturan: Pengaturan }>> {
  return postAction(apiUrl, { action: 'saveSettings', pengaturan });
}

// ---------- CRUD generik per entitas ----------

export async function saveGuru(apiUrl: string, item: GuruItem): Promise<ApiResult<{ item: GuruItem }>> {
  return postAction(apiUrl, { action: 'saveGuru', item });
}
export async function deleteGuru(apiUrl: string, id: string): Promise<ApiResult> {
  return postAction(apiUrl, { action: 'deleteGuru', id });
}

export async function saveMapel(apiUrl: string, item: MapelItem): Promise<ApiResult<{ item: MapelItem }>> {
  return postAction(apiUrl, { action: 'saveMapel', item });
}
export async function deleteMapel(apiUrl: string, id: string): Promise<ApiResult> {
  return postAction(apiUrl, { action: 'deleteMapel', id });
}

export async function saveKelas(apiUrl: string, item: KelasItem): Promise<ApiResult<{ item: KelasItem }>> {
  return postAction(apiUrl, { action: 'saveKelas', item });
}
export async function deleteKelas(apiUrl: string, id: string): Promise<ApiResult> {
  return postAction(apiUrl, { action: 'deleteKelas', id });
}

export async function saveSiswa(apiUrl: string, item: SiswaItem): Promise<ApiResult<{ item: SiswaItem }>> {
  return postAction(apiUrl, { action: 'saveSiswa', item });
}
export async function deleteSiswa(apiUrl: string, id: string): Promise<ApiResult> {
  return postAction(apiUrl, { action: 'deleteSiswa', id });
}

export async function saveJurnal(apiUrl: string, item: JurnalItem): Promise<ApiResult<{ item: JurnalItem }>> {
  return postAction(apiUrl, { action: 'saveJurnal', item });
}
export async function deleteJurnal(apiUrl: string, id: string): Promise<ApiResult> {
  return postAction(apiUrl, { action: 'deleteJurnal', id });
}

/** Simpan nilai satu kelas+mapel sekaligus (backend mengganti semua baris lama pasangan tsb). */
export async function savePenilaian(
  apiUrl: string,
  rows: PenilaianItem[]
): Promise<ApiResult<{ rows: PenilaianItem[] }>> {
  return postAction(apiUrl, { action: 'savePenilaian', rows });
}

/** Unggah logo ke Google Drive via backend. Mengembalikan URL publik logo. */
export async function uploadLogo(
  apiUrl: string,
  params: { fileName: string; base64Data: string; mimeType: string }
): Promise<ApiResult<{ fileId: string; url: string }>> {
  return postAction(apiUrl, { action: 'uploadLogo', ...params });
}
