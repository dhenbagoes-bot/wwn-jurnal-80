// Smoke test backend Kode.gs dengan stub Google Apps Script.
// Menjalankan Kode.gs ASLI di dalam vm Node dan menguji alur:
// initDatabase, settings, CRUD guru/mapel/kelas/siswa/jurnal, penilaian + rumus NA.
// Jalankan: node test/smoke.mjs   (exit 0 = semua lolos)
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'backend', 'Kode.gs'), 'utf8');

// ---------- Stub Spreadsheet ----------
function makeSheet(name, headers) {
  const grid = [headers.slice()]; // baris 0 = header
  return {
    _name: name,
    getName() { return this._name; },
    setFrozenRows() {},
    getLastRow() { return grid.length; },
    getLastColumn() { return grid[0].length; },
    getSheetValues() { return grid; },
    getRange(r, c, nr = 1, nc = 1) {
      const self = this;
      function ensure(rr, cc) {
        while (grid.length < rr) grid.push(new Array(grid[0].length).fill(''));
        for (const row of grid) while (row.length < cc) row.push('');
      }
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) {
              const gr = grid[r - 1 + i];
              row.push(gr ? (gr[c - 1 + j] ?? '') : '');
            }
            out.push(row);
          }
          return out;
        },
        getValue() { return this.getValues()[0][0]; },
        setValues(vals) {
          for (let i = 0; i < vals.length; i++)
            for (let j = 0; j < vals[i].length; j++) {
              ensure(r + i, c + j);
              grid[r - 1 + i][c - 1 + j] = vals[i][j];
            }
        },
        setValue(v) { this.setValues([[v]]); },
      };
    },
    appendRow(row) {
      const h = grid[0].length;
      const full = row.slice(0, h);
      while (full.length < h) full.push('');
      grid.push(full);
    },
    deleteRow(n) {
      if (n < 1 || n > grid.length) throw new Error('Row out of range: ' + n);
      grid.splice(n - 1, 1);
    },
  };
}

const sheets = new Map();
const SpreadsheetApp = {
  getActiveSpreadsheet() {
    return {
      getName() { return 'DB TEST'; },
      getSheetByName(n) { return sheets.get(n) || null; },
      insertSheet(n) {
        const s = makeSheet(n, []);
        sheets.set(n, s);
        return s;
      },
    };
  },
};

const ContentService = {
  MimeType: { JSON: 'application/json' },
  createTextOutput(text) {
    return {
      _t: String(text),
      getContent() { return this._t; },
      setMimeType() { return this; },
    };
  },
};

const Utilities = {
  getUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  },
  formatDate(d, _tz, fmt) {
    const p = (n) => String(n).padStart(2, '0');
    if (fmt === 'yyyy-MM-dd') return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    return d.toISOString();
  },
};
const Session = { getScriptTimeZone: () => 'Asia/Jakarta' };

// ---------- Stub DriveApp ----------
const DriveApp = {
  Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' },
  Permission: { VIEW: 'VIEW' },
  _folders: {},
  getFoldersByName(name) {
    const list = this._folders[name] ? [this._folders[name]] : [];
    let i = 0;
    return { hasNext: () => i < list.length, next: () => list[i++] };
  },
  createFolder(name) {
    const folder = {
      _files: [],
      setSharing() {},
      createFile(blob) {
        const file = {
          _id: 'file_' + Math.random().toString(36).slice(2, 10),
          _blob: blob,
          getId() { return this._id; },
          setSharing() {},
        };
        folder._files.push(file);
        return file;
      },
    };
    this._folders[name] = folder;
    return folder;
  },
};
const UtilitiesWithDrive = {
  ...Utilities,
  base64Decode: (s) => Buffer.from(s, 'base64'),
  newBlob: (bytes, mimeType, name) => ({ bytes, mimeType, name }),
};

// ---------- Jalankan Kode.gs di sandbox ----------
const ctx = vm.createContext({ SpreadsheetApp, ContentService, Utilities: UtilitiesWithDrive, Session, DriveApp, console });
vm.runInContext(src, ctx, { filename: 'Kode.gs' });

// Helper: panggil doPost/doGet lalu parse JSON respons
function post(action, extra = {}) {
  const out = vm.runInContext(
    `doPost({postData:{contents:${JSON.stringify(JSON.stringify({ action, ...extra }))}}})`,
    ctx
  );
  return JSON.parse(out.getContent());
}
function get(action) {
  const out = vm.runInContext(`doGet({parameter:{action:${JSON.stringify(action)}}})`, ctx);
  return JSON.parse(out.getContent());
}

// ---------- Mini test runner ----------
let passed = 0, failed = 0;
function ok(cond, label, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ GAGAL: ${label} ${detail}`); }
}
function eq(a, b, label) {
  ok(JSON.stringify(a) === JSON.stringify(b), label, `(dapat ${JSON.stringify(a)}, harap ${JSON.stringify(b)})`);
}

console.log('\n[1] initDatabase');
let r = post('initDatabase');
ok(r.success, 'initDatabase sukses');
ok(sheets.size === 7, '7 sheet dibuat', `(ada ${sheets.size})`);
const hdrJurnal = sheets.get('Jurnal').getSheetValues()[0];
ok(hdrJurnal[1] === 'Tanggal' && hdrJurnal[10] === 'AbsensiJSON', 'header Jurnal benar');

console.log('\n[2] ping & getAllData');
r = get('ping');
ok(r.success && r.version === '1.0.0', 'ping mengembalikan versi');
r = get('getAllData');
ok(r.success, 'getAllData sukses');
eq(r.data.pengaturan.namaSekolah, 'MTs AL ISLAM NGLESES', 'default namaSekolah');
eq(r.data.pengaturan.bobotPH, 40, 'default bobotPH=40');
ok(Array.isArray(r.data.jurnal) && r.data.jurnal.length === 0, 'jurnal awal kosong');

console.log('\n[3] saveSettings');
r = post('saveSettings', { pengaturan: { namaSekolah: 'MI TEST', bobotPH: 50, bobotPTS: 20, bobotPAS: 20, bobotKTR: 5, bobotSikap: 5 } });
ok(r.success, 'saveSettings sukses');
r = get('getAllData');
eq(r.data.pengaturan.namaSekolah, 'MI TEST', 'namaSekolah tersimpan');
eq(r.data.pengaturan.bobotPH, 50, 'bobotPH tersimpan=50');

console.log('\n[4] CRUD Guru');
r = post('saveGuru', { item: { nama: 'Budi Santoso', nip: '123', mapel: 'Matematika' } });
ok(r.success && r.data.item.id.startsWith('GR-'), 'guru baru dapat ID GR-');
const gid = r.data.item.id;
ok(r.data.item.statusAktif === true, 'statusAktif default true');
r = post('saveGuru', { item: { id: gid, nama: 'Budi S. Updated', nip: '123', mapel: 'Matematika', statusAktif: true } });
ok(r.success, 'update guru sukses');
r = get('getAllData');
eq(r.data.guru.length, 1, 'tetap 1 guru setelah update');
eq(r.data.guru[0].nama, 'Budi S. Updated', 'nama guru terupdate');
r = post('saveGuru', { item: { nama: '' } });
ok(!r.success, 'guru tanpa nama ditolak');
r = post('deleteGuru', { id: gid });
ok(r.success, 'hapus guru sukses');
r = post('deleteGuru', { id: gid });
ok(!r.success, 'hapus guru yang sudah tidak ada → error');

console.log('\n[5] Mapel, Kelas, Siswa + validasi');
r = post('saveMapel', { item: { nama: 'Matematika', kelompok: 'A' } });
const mapelId = r.data.item.id;
r = post('saveKelas', { item: { nama: '7A', tingkat: 'VII', waliKelas: 'Budi' } });
const kelasId = r.data.item.id;
r = post('saveSiswa', { item: { nama: 'Andi', nis: '001', kelasId, kelasNama: '7A', jenisKelamin: 'L' } });
ok(r.success, 'simpan siswa sukses');
const siswaId = r.data.item.id;
r = post('saveSiswa', { item: { nama: 'Tanpa Kelas', kelasId: '' } });
ok(!r.success, 'siswa tanpa kelas ditolak');

console.log('\n[6] Jurnal + validasi + absensi JSON');
r = post('saveJurnal', { item: { tanggal: '16-10-2026', guruId: gid, mapelId, kelasId } });
ok(!r.success, 'tanggal format salah ditolak');
r = post('saveJurnal', {
  item: {
    tanggal: '2026-10-16', guruId: gid, guruNama: 'Budi', mapelId, mapelNama: 'Matematika',
    kelasId, kelasNama: '7A', materiPokok: 'Aljabar', tujuanPembelajaran: 'Memahami variabel',
    absensi: { [siswaId]: 'H' }, catatan: 'Lancar',
  },
});
ok(r.success && r.data.item.id.startsWith('JRN-'), 'simpan jurnal sukses');
const jid = r.data.item.id;
r = get('getAllData');
eq(r.data.jurnal.length, 1, '1 jurnal tersimpan');
eq(r.data.jurnal[0].absensi[siswaId], 'H', 'absensi JSON round-trip');
eq(r.data.jurnal[0].tanggal, '2026-10-16', 'tanggal konsisten yyyy-mm-dd');
r = post('saveJurnal', { item: { id: jid, tanggal: '2026-10-16', guruId: gid, guruNama: 'Budi', mapelId, mapelNama: 'Matematika', kelasId, kelasNama: '7A', materiPokok: 'Aljabar Revisi', absensi: {} } });
ok(r.success, 'update jurnal sukses');
r = get('getAllData');
eq(r.data.jurnal[0].materiPokok, 'Aljabar Revisi', 'materi terupdate');
r = post('deleteJurnal', { id: jid });
ok(r.success && get('getAllData').data.jurnal.length === 0, 'hapus jurnal sukses');

console.log('\n[7] Penilaian + rumus NA (bobot saat ini 50/20/20/5/5)');
// ph=[80,90] avg=85; pts=70; pas=75; ktr=80; sikap=90
// NA = (85*50 + 70*20 + 75*20 + 80*5 + 90*5)/100 = (4250+1400+1500+400+450)/100 = 8000/100 = 80
r = post('saveSiswa', { item: { nama: 'Siti', nis: '002', kelasId, kelasNama: '7A', jenisKelamin: 'P' } });
const siswa2 = r.data.item.id;
r = post('savePenilaian', {
  rows: [
    { kelasId, kelasNama: '7A', mapelId, mapelNama: 'Matematika', siswaId, siswaNama: 'Andi', ph: [80, 90], pts: 70, pas: 75, ktr: 80, sikap: 90 },
    { kelasId, kelasNama: '7A', mapelId, mapelNama: 'Matematika', siswaId: siswa2, siswaNama: 'Siti', ph: [], pts: 0, pas: 0, ktr: 0, sikap: 0 },
  ],
});
ok(r.success, 'simpan nilai sukses');
eq(r.data.rows[0].na, 80, 'NA Andi = 80 (rumus backend benar)');
eq(r.data.rows[1].na, 0, 'NA Siti (kosong) = 0');
r = get('getAllData');
eq(r.data.penilaian.length, 2, '2 baris nilai tersimpan');
// Simpan ulang dengan nilai beda → harus replace (tetap 2 baris), mapel lain tidak ikut terhapus
r = post('saveMapel', { item: { nama: 'IPA', kelompok: 'A' } });
const mapel2 = r.data.item.id;
post('savePenilaian', { rows: [{ kelasId, kelasNama: '7A', mapelId: mapel2, mapelNama: 'IPA', siswaId, siswaNama: 'Andi', ph: [100], pts: 100, pas: 100, ktr: 100, sikap: 100 }] });
r = post('savePenilaian', {
  rows: [{ kelasId, kelasNama: '7A', mapelId, mapelNama: 'Matematika', siswaId, siswaNama: 'Andi', ph: [60], pts: 60, pas: 60, ktr: 60, sikap: 60 }],
});
r = get('getAllData');
const nilMat = r.data.penilaian.filter((x) => x.mapelId === mapelId);
const nilIpa = r.data.penilaian.filter((x) => x.mapelId === mapel2);
eq(nilMat.length, 1, 'replace: nilai Matematika tinggal 1 baris');
eq(nilIpa.length, 1, 'nilai IPA tidak ikut terhapus');
eq(nilMat[0].na, 60, 'NA setelah replace = 60');

console.log('\n[8] aksi tidak dikenal');
r = post('aksiNgawur', {});
ok(!r.success, 'aksi tidak dikenal → error rapi');

console.log('\n[9] uploadLogo ke Drive (stub)');
const tinyPng = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]).toString('base64');
r = post('uploadLogo', { fileName: 'logo.png', base64Data: '', mimeType: 'image/png' });
ok(!r.success, 'data kosong ditolak');
r = post('uploadLogo', { fileName: 'logo.txt', base64Data: tinyPng, mimeType: 'text/plain' });
ok(!r.success, 'bukan gambar ditolak');
r = post('uploadLogo', { fileName: 'logo sekolah.png', base64Data: tinyPng, mimeType: 'image/png' });
ok(r.success, 'upload logo sukses');
ok(r.data && r.data.url.startsWith('https://lh3.googleusercontent.com/d/'), 'URL logo format benar');
r = get('getAllData');
eq(r.data.pengaturan.logoUrl.startsWith('https://lh3.googleusercontent.com/d/'), true, 'logoUrl tersimpan di Pengaturan');
// Upload kedua menimpa (tetap 1 key logoUrl)
const before = get('getAllData').data.pengaturan.logoUrl;
post('uploadLogo', { fileName: 'logo2.png', base64Data: tinyPng, mimeType: 'image/png' });
const after = get('getAllData').data.pengaturan.logoUrl;
ok(after !== before && after.startsWith('https://lh3.googleusercontent.com/d/'), 'logoUrl terupdate (tidak duplikat)');

console.log(`\nHASIL: ${passed} lolos, ${failed} gagal`);
process.exit(failed > 0 ? 1 : 0);
