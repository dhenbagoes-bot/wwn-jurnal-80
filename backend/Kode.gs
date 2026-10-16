/**
 * BACKEND — Sistem Digital Jurnal Mengajar (wwn-jurnal-80)
 * Google Apps Script + Google Sheets
 *
 * CARA PAKAI:
 *  1. Buat Google Spreadsheet baru (mis. "Database Jurnal Mengajar").
 *  2. Buka Extensions > Apps Script, HAPUS seluruh isi editor,
 *     lalu PASTE seluruh file ini.
 *  3. Deploy > New deployment > Web app:
 *     - Execute as: Me
 *     - Who has access: Anyone
 *  4. Salin URL /exec ke menu Konfigurasi di aplikasi,
 *     lalu klik "Inisialisasi 7 Sheet".
 *
 * Sheet yang dibuat: Pengaturan, Guru, Mapel, Kelas, Siswa, Jurnal, Penilaian
 */

// ============================================================
// KONFIGURASI SHEET (satu sumber kebenaran untuk nama & header)
// ============================================================
var SHEET_PENGATURAN = 'Pengaturan';
var SHEET_GURU = 'Guru';
var SHEET_MAPEL = 'Mapel';
var SHEET_KELAS = 'Kelas';
var SHEET_SISWA = 'Siswa';
var SHEET_JURNAL = 'Jurnal';
var SHEET_PENILAIAN = 'Penilaian';

var HEADERS = {};
HEADERS[SHEET_PENGATURAN] = ['Kunci', 'Nilai'];
HEADERS[SHEET_GURU] = ['ID', 'Nama', 'NIP', 'MataPelajaran', 'StatusAktif'];
HEADERS[SHEET_MAPEL] = ['ID', 'NamaMapel', 'Kelompok'];
HEADERS[SHEET_KELAS] = ['ID', 'NamaKelas', 'Tingkat', 'WaliKelas'];
HEADERS[SHEET_SISWA] = ['ID', 'Nama', 'NIS', 'KelasID', 'KelasNama', 'JenisKelamin', 'StatusAktif'];
HEADERS[SHEET_JURNAL] = ['ID', 'Tanggal', 'GuruID', 'GuruNama', 'MapelID', 'MapelNama', 'KelasID', 'KelasNama',
  'MateriPokok', 'TujuanPembelajaran', 'AbsensiJSON', 'Catatan', 'DibuatPada', 'DiubahPada'];
HEADERS[SHEET_PENILAIAN] = ['ID', 'KelasID', 'KelasNama', 'MapelID', 'MapelNama', 'SiswaID', 'SiswaNama',
  'PH1', 'PH2', 'PH3', 'PH4', 'PH5', 'PH6', 'PH7', 'PH8', 'PH9', 'PH10',
  'PTS', 'PAS', 'KTR', 'Sikap', 'NA', 'TahunPelajaran', 'DiubahPada'];

var DEFAULT_PENGATURAN = [
  ['namaSekolah', 'MTs AL ISLAM NGLESES'],
  ['npsn', ''],
  ['alamat', ''],
  ['tahunPelajaran', '2026/2027'],
  ['kepalaSekolah', ''],
  ['bobotPH', '40'],
  ['bobotPTS', '20'],
  ['bobotPAS', '20'],
  ['bobotKTR', '10'],
  ['bobotSikap', '10']
];

var APP_VERSION = '1.0.0';

// ============================================================
// ENTRY POINT
// ============================================================
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'ping';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (action === 'getAllData') {
      return jsonResponse({
        success: true,
        message: 'Data berhasil dimuat.',
        data: {
          pengaturan: getSettings(ss),
          guru: getGuruList(ss),
          mapel: getMapelList(ss),
          kelas: getKelasList(ss),
          siswa: getSiswaList(ss),
          jurnal: getJurnalList(ss),
          penilaian: getPenilaianList(ss),
          database: getDatabaseSummary(ss)
        }
      });
    }
    // ping (default)
    return jsonResponse({ success: true, message: 'Backend Jurnal Mengajar aktif.', version: APP_VERSION });
  } catch (err) {
    return jsonResponse({ success: false, error: 'doGet: ' + err.message });
  }
}

function doPost(e) {
  try {
    var payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = payload.action || '';
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case 'initDatabase':
        initializeAllSheets(ss);
        return jsonResponse({ success: true, message: '7 sheet database berhasil diinisialisasi.', data: getDatabaseSummary(ss) });

      case 'saveSettings':
        saveSettings(ss, payload.pengaturan || {});
        return jsonResponse({ success: true, message: 'Pengaturan berhasil disimpan.', data: { pengaturan: getSettings(ss) } });

      case 'saveGuru': {
        var g = saveGuruItem(ss, payload.item || {});
        return jsonResponse({ success: true, message: 'Data guru berhasil disimpan.', data: { item: g } });
      }
      case 'deleteGuru':
        deleteGuruItem(ss, payload.id);
        return jsonResponse({ success: true, message: 'Data guru berhasil dihapus.' });

      case 'saveMapel': {
        var m = saveMapelItem(ss, payload.item || {});
        return jsonResponse({ success: true, message: 'Data mapel berhasil disimpan.', data: { item: m } });
      }
      case 'deleteMapel':
        deleteMapelItem(ss, payload.id);
        return jsonResponse({ success: true, message: 'Data mapel berhasil dihapus.' });

      case 'saveKelas': {
        var k = saveKelasItem(ss, payload.item || {});
        return jsonResponse({ success: true, message: 'Data kelas berhasil disimpan.', data: { item: k } });
      }
      case 'deleteKelas':
        deleteKelasItem(ss, payload.id);
        return jsonResponse({ success: true, message: 'Data kelas berhasil dihapus.' });

      case 'saveSiswa': {
        var s = saveSiswaItem(ss, payload.item || {});
        return jsonResponse({ success: true, message: 'Data siswa berhasil disimpan.', data: { item: s } });
      }
      case 'deleteSiswa':
        deleteSiswaItem(ss, payload.id);
        return jsonResponse({ success: true, message: 'Data siswa berhasil dihapus.' });

      case 'saveJurnal': {
        var j = saveJurnalItem(ss, payload.item || {});
        return jsonResponse({ success: true, message: 'Jurnal berhasil disimpan.', data: { item: j } });
      }
      case 'deleteJurnal':
        deleteJurnalItem(ss, payload.id);
        return jsonResponse({ success: true, message: 'Jurnal berhasil dihapus.' });

      case 'savePenilaian': {
        var rows = savePenilaianRows(ss, payload.rows || []);
        return jsonResponse({ success: true, message: 'Nilai berhasil disimpan (' + rows.length + ' siswa).', data: { rows: rows } });
      }

      default:
        return jsonResponse({ success: false, error: 'Aksi tidak dikenal: ' + action });
    }
  } catch (err) {
    return jsonResponse({ success: false, error: 'doPost: ' + err.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HELPER GENERIK
// ============================================================

/** Ambil sheet, buat jika belum ada (dengan header yang benar). */
function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = HEADERS[name] || [];
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/** Semua baris data (tanpa header) sebagai array. */
function getDataRows(sheet) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

/** Cari nomor baris (1-based, termasuk header) berdasarkan ID di kolom 1. */
function findRowById(sheet, id) {
  if (!id) return -1;
  var rows = getDataRows(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

/** Hapus baris berdasarkan ID di kolom 1. */
function deleteRowById(sheet, id) {
  var rowNum = findRowById(sheet, id);
  if (rowNum < 2) throw new Error('Data tidak ditemukan (ID: ' + id + ').');
  sheet.deleteRow(rowNum);
}

function asString(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function asBool(v) {
  return v === true || v === 'TRUE' || v === 'true' || v === 1;
}

function asNumber(v) {
  var n = parseFloat(String(v === null || v === undefined ? '' : v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

/** Normalisasi nilai tanggal dari sheet menjadi 'yyyy-mm-dd'. */
function asYMD(v) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var s = asString(v);
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  return s;
}

function nowISO() {
  return new Date().toISOString();
}

function newUuid(prefix) {
  return prefix + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 8).toLowerCase();
}

/** Parse AbsensiJSON dengan aman → object {siswaId: 'H'|'S'|'I'|'A'}. */
function parseAbsensi(raw) {
  try {
    var obj = typeof raw === 'string' ? JSON.parse(raw || '{}') : (raw || {});
    var out = {};
    for (var k in obj) {
      var v = String(obj[k]).toUpperCase();
      if (v === 'H' || v === 'S' || v === 'I' || v === 'A') out[k] = v;
    }
    return out;
  } catch (e) {
    return {};
  }
}

// ============================================================
// INISIALISASI
// ============================================================
function initializeAllSheets(ss) {
  getPengaturanSheet(ss);
  getGuruSheet(ss);
  getMapelSheet(ss);
  getKelasSheet(ss);
  getSiswaSheet(ss);
  getJurnalSheet(ss);
  getPenilaianSheet(ss);
}

// ============================================================
// PENGATURAN
// ============================================================
function getPengaturanSheet(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_PENGATURAN);
  if (sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, DEFAULT_PENGATURAN.length, 2).setValues(DEFAULT_PENGATURAN);
  }
  return sheet;
}

function getSettings(ss) {
  var sheet = getPengaturanSheet(ss);
  var rows = getDataRows(sheet);
  var map = {};
  for (var i = 0; i < rows.length; i++) {
    map[asString(rows[i][0])] = asString(rows[i][1]);
  }
  var num = function (k, def) {
    var n = parseFloat(map[k]);
    return isNaN(n) ? def : n;
  };
  return {
    namaSekolah: map.namaSekolah || '',
    npsn: map.npsn || '',
    alamat: map.alamat || '',
    tahunPelajaran: map.tahunPelajaran || '',
    kepalaSekolah: map.kepalaSekolah || '',
    bobotPH: num('bobotPH', 40),
    bobotPTS: num('bobotPTS', 20),
    bobotPAS: num('bobotPAS', 20),
    bobotKTR: num('bobotKTR', 10),
    bobotSikap: num('bobotSikap', 10)
  };
}

function saveSettings(ss, pengaturan) {
  var sheet = getPengaturanSheet(ss);
  var keys = ['namaSekolah', 'npsn', 'alamat', 'tahunPelajaran', 'kepalaSekolah',
    'bobotPH', 'bobotPTS', 'bobotPAS', 'bobotKTR', 'bobotSikap'];
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (pengaturan[k] === undefined) continue;
    var rowNum = findRowByKey(sheet, k);
    if (rowNum > 0) {
      sheet.getRange(rowNum, 2).setValue(String(pengaturan[k]));
    } else {
      sheet.appendRow([k, String(pengaturan[k])]);
    }
  }
}

function findRowByKey(sheet, key) {
  var rows = getDataRows(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (asString(rows[i][0]) === key) return i + 2;
  }
  return -1;
}

// ============================================================
// GURU
// ============================================================
function getGuruSheet(ss) {
  return getOrCreateSheet(ss, SHEET_GURU);
}

function getGuruList(ss) {
  var rows = getDataRows(getGuruSheet(ss));
  return rows.map(function (r) {
    return {
      id: asString(r[0]),
      nama: asString(r[1]),
      nip: asString(r[2]),
      mapel: asString(r[3]),
      statusAktif: asBool(r[4])
    };
  }).filter(function (g) { return g.id !== ''; });
}

function saveGuruItem(ss, item) {
  if (!asString(item.nama)) throw new Error('Nama guru wajib diisi.');
  var sheet = getGuruSheet(ss);
  var id = asString(item.id);
  var row = [id || newUuid('GR'), asString(item.nama), asString(item.nip), asString(item.mapel), item.statusAktif === false ? false : true];
  if (id) {
    var rowNum = findRowById(sheet, id);
    if (rowNum > 0) {
      sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }
  } else {
    sheet.appendRow(row);
  }
  return { id: row[0], nama: row[1], nip: row[2], mapel: row[3], statusAktif: row[4] === true };
}

function deleteGuruItem(ss, id) {
  deleteRowById(getGuruSheet(ss), asString(id));
}

// ============================================================
// MAPEL
// ============================================================
function getMapelSheet(ss) {
  return getOrCreateSheet(ss, SHEET_MAPEL);
}

function getMapelList(ss) {
  var rows = getDataRows(getMapelSheet(ss));
  return rows.map(function (r) {
    return { id: asString(r[0]), nama: asString(r[1]), kelompok: asString(r[2]) };
  }).filter(function (m) { return m.id !== ''; });
}

function saveMapelItem(ss, item) {
  if (!asString(item.nama)) throw new Error('Nama mapel wajib diisi.');
  var sheet = getMapelSheet(ss);
  var id = asString(item.id);
  var row = [id || newUuid('MP'), asString(item.nama), asString(item.kelompok)];
  if (id && findRowById(sheet, id) > 0) {
    sheet.getRange(findRowById(sheet, id), 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { id: row[0], nama: row[1], kelompok: row[2] };
}

function deleteMapelItem(ss, id) {
  deleteRowById(getMapelSheet(ss), asString(id));
}

// ============================================================
// KELAS
// ============================================================
function getKelasSheet(ss) {
  return getOrCreateSheet(ss, SHEET_KELAS);
}

function getKelasList(ss) {
  var rows = getDataRows(getKelasSheet(ss));
  return rows.map(function (r) {
    return { id: asString(r[0]), nama: asString(r[1]), tingkat: asString(r[2]), waliKelas: asString(r[3]) };
  }).filter(function (k) { return k.id !== ''; });
}

function saveKelasItem(ss, item) {
  if (!asString(item.nama)) throw new Error('Nama kelas wajib diisi.');
  var sheet = getKelasSheet(ss);
  var id = asString(item.id);
  var row = [id || newUuid('KL'), asString(item.nama), asString(item.tingkat), asString(item.waliKelas)];
  if (id && findRowById(sheet, id) > 0) {
    sheet.getRange(findRowById(sheet, id), 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { id: row[0], nama: row[1], tingkat: row[2], waliKelas: row[3] };
}

function deleteKelasItem(ss, id) {
  deleteRowById(getKelasSheet(ss), asString(id));
}

// ============================================================
// SISWA
// ============================================================
function getSiswaSheet(ss) {
  return getOrCreateSheet(ss, SHEET_SISWA);
}

function getSiswaList(ss) {
  var rows = getDataRows(getSiswaSheet(ss));
  return rows.map(function (r) {
    return {
      id: asString(r[0]),
      nama: asString(r[1]),
      nis: asString(r[2]),
      kelasId: asString(r[3]),
      kelasNama: asString(r[4]),
      jenisKelamin: asString(r[5]).toUpperCase() === 'P' ? 'P' : 'L',
      statusAktif: asBool(r[6])
    };
  }).filter(function (s) { return s.id !== ''; });
}

function saveSiswaItem(ss, item) {
  if (!asString(item.nama)) throw new Error('Nama siswa wajib diisi.');
  if (!asString(item.kelasId)) throw new Error('Kelas siswa wajib dipilih.');
  var sheet = getSiswaSheet(ss);
  var id = asString(item.id);
  var row = [id || newUuid('SW'), asString(item.nama), asString(item.nis), asString(item.kelasId),
    asString(item.kelasNama), (asString(item.jenisKelamin).toUpperCase() === 'P' ? 'P' : 'L'),
    item.statusAktif === false ? false : true];
  if (id && findRowById(sheet, id) > 0) {
    sheet.getRange(findRowById(sheet, id), 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  return { id: row[0], nama: row[1], nis: row[2], kelasId: row[3], kelasNama: row[4], jenisKelamin: row[5], statusAktif: row[6] === true };
}

function deleteSiswaItem(ss, id) {
  deleteRowById(getSiswaSheet(ss), asString(id));
}

// ============================================================
// JURNAL
// ============================================================
function getJurnalSheet(ss) {
  return getOrCreateSheet(ss, SHEET_JURNAL);
}

function jurnalRowToObj(r) {
  return {
    id: asString(r[0]),
    tanggal: asYMD(r[1]),
    guruId: asString(r[2]),
    guruNama: asString(r[3]),
    mapelId: asString(r[4]),
    mapelNama: asString(r[5]),
    kelasId: asString(r[6]),
    kelasNama: asString(r[7]),
    materiPokok: asString(r[8]),
    tujuanPembelajaran: asString(r[9]),
    absensi: parseAbsensi(r[10]),
    catatan: asString(r[11]),
    dibuatPada: asString(r[12]),
    diubahPada: asString(r[13])
  };
}

function getJurnalList(ss) {
  var rows = getDataRows(getJurnalSheet(ss));
  return rows.map(jurnalRowToObj).filter(function (j) { return j.id !== ''; });
}

function saveJurnalItem(ss, item) {
  var tanggal = asYMD(item.tanggal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal tidak valid (format: yyyy-mm-dd).');
  if (!asString(item.guruId)) throw new Error('Guru wajib dipilih.');
  if (!asString(item.mapelId)) throw new Error('Mata pelajaran wajib dipilih.');
  if (!asString(item.kelasId)) throw new Error('Kelas wajib dipilih.');

  var sheet = getJurnalSheet(ss);
  var id = asString(item.id);
  var now = nowISO();
  var absensiJson = JSON.stringify(parseAbsensi(item.absensi));

  if (id) {
    var rowNum = findRowById(sheet, id);
    if (rowNum > 0) {
      var dibuat = asString(sheet.getRange(rowNum, 13).getValue()) || now;
      var row = [id, tanggal, asString(item.guruId), asString(item.guruNama), asString(item.mapelId),
        asString(item.mapelNama), asString(item.kelasId), asString(item.kelasNama),
        asString(item.materiPokok), asString(item.tujuanPembelajaran), absensiJson,
        asString(item.catatan), dibuat, now];
      sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
      return jurnalRowToObj(row);
    }
  }
  var newId = newUuid('JRN');
  var newRow = [newId, tanggal, asString(item.guruId), asString(item.guruNama), asString(item.mapelId),
    asString(item.mapelNama), asString(item.kelasId), asString(item.kelasNama),
    asString(item.materiPokok), asString(item.tujuanPembelajaran), absensiJson,
    asString(item.catatan), now, now];
  sheet.appendRow(newRow);
  return jurnalRowToObj(newRow);
}

function deleteJurnalItem(ss, id) {
  deleteRowById(getJurnalSheet(ss), asString(id));
}

// ============================================================
// PENILAIAN
// ============================================================
function getPenilaianSheet(ss) {
  return getOrCreateSheet(ss, SHEET_PENILAIAN);
}

function penilaianRowToObj(r) {
  var ph = [];
  for (var i = 0; i < 10; i++) ph.push(asNumber(r[7 + i]));
  return {
    id: asString(r[0]),
    kelasId: asString(r[1]),
    kelasNama: asString(r[2]),
    mapelId: asString(r[3]),
    mapelNama: asString(r[4]),
    siswaId: asString(r[5]),
    siswaNama: asString(r[6]),
    ph: ph,
    pts: asNumber(r[17]),
    pas: asNumber(r[18]),
    ktr: asNumber(r[19]),
    sikap: asNumber(r[20]),
    na: asNumber(r[21]),
    tahunPelajaran: asString(r[22]),
    diubahPada: asString(r[23])
  };
}

function getPenilaianList(ss) {
  var rows = getDataRows(getPenilaianSheet(ss));
  return rows.map(penilaianRowToObj).filter(function (p) { return p.id !== ''; });
}

/** Batasi nilai 0–100. */
function clamp100(v) {
  return Math.min(100, Math.max(0, asNumber(v)));
}

/**
 * RUMUS TUNGGAL Nilai Akhir — harus sama dengan frontend (utils/format.ts: hitungNA).
 * NA = (rataPH*bobotPH + PTS*bobotPTS + PAS*bobotPAS + KTR*bobotKTR + Sikap*bobotSikap) / 100
 */
function hitungNA(ph, pts, pas, ktr, sikap, bobot) {
  var bersih = [];
  for (var i = 0; i < ph.length; i++) {
    var n = clamp100(ph[i]);
    if (n > 0) bersih.push(n);
  }
  var rataPH = bersih.length > 0
    ? bersih.reduce(function (a, b) { return a + b; }, 0) / bersih.length : 0;
  var na = (rataPH * bobot.bobotPH +
    clamp100(pts) * bobot.bobotPTS +
    clamp100(pas) * bobot.bobotPAS +
    clamp100(ktr) * bobot.bobotKTR +
    clamp100(sikap) * bobot.bobotSikap) / 100;
  return Math.round(na * 10) / 10;
}

/**
 * Simpan nilai satu pasangan (kelas, mapel): hapus baris lama pasangan tsb,
 * tulis ulang dari rows. Mengembalikan rows yang tersimpan (dengan NA terhitung).
 */
function savePenilaianRows(ss, rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Data nilai kosong.');
  var sheet = getPenilaianSheet(ss);
  var bobot = getSettings(ss);
  var now = nowISO();
  var tahunPelajaran = bobot.tahunPelajaran || '';

  // Validasi: semua baris harus satu pasangan kelas+mapel
  var kelasId = asString(rows[0].kelasId);
  var mapelId = asString(rows[0].mapelId);
  if (!kelasId || !mapelId) throw new Error('Kelas dan mapel wajib diisi.');
  for (var i = 0; i < rows.length; i++) {
    if (asString(rows[i].kelasId) !== kelasId || asString(rows[i].mapelId) !== mapelId) {
      throw new Error('Semua baris nilai harus untuk kelas & mapel yang sama.');
    }
    if (!asString(rows[i].siswaId)) throw new Error('Baris ke-' + (i + 1) + ': siswa belum diisi.');
  }

  // Hapus baris lama pasangan (kelasId, mapelId) — dari bawah agar indeks aman
  var dataRows = getDataRows(sheet);
  for (var d = dataRows.length - 1; d >= 0; d--) {
    if (asString(dataRows[d][1]) === kelasId && asString(dataRows[d][3]) === mapelId) {
      sheet.deleteRow(d + 2);
    }
  }

  // Tulis baris baru
  var saved = [];
  for (var j = 0; j < rows.length; j++) {
    var it = rows[j];
    var ph = [];
    for (var p = 0; p < 10; p++) ph.push(asNumber(it.ph && it.ph[p]));
    var na = hitungNA(ph, it.pts, it.pas, it.ktr, it.sikap, bobot);
    var row = [asString(it.id) || newUuid('NL'), kelasId, asString(it.kelasNama),
      mapelId, asString(it.mapelNama), asString(it.siswaId), asString(it.siswaNama)]
      .concat(ph, [asNumber(it.pts), asNumber(it.pas), asNumber(it.ktr), asNumber(it.sikap),
        na, asString(it.tahunPelajaran) || tahunPelajaran, now]);
    sheet.appendRow(row);
    saved.push(penilaianRowToObj(row));
  }
  return saved;
}

// ============================================================
// RINGKASAN DATABASE
// ============================================================
function getDatabaseSummary(ss) {
  var names = [SHEET_PENGATURAN, SHEET_GURU, SHEET_MAPEL, SHEET_KELAS, SHEET_SISWA, SHEET_JURNAL, SHEET_PENILAIAN];
  var sheets = names.map(function (n) {
    var sh = ss.getSheetByName(n);
    return {
      name: n,
      exists: !!sh,
      rowCount: sh ? Math.max(0, sh.getLastRow() - 1) : 0
    };
  });
  return {
    connected: true,
    spreadsheetTitle: ss.getName(),
    sheets: sheets,
    lastChecked: nowISO()
  };
}
