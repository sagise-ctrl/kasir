// ============================================================
//  KASIR - Backend API (Google Apps Script)
//  Deploy sebagai: Web App → Execute as: Me → Who has access: Anyone
//  File: Code.gs
// ============================================================

// ============================================================
//  ROUTER UTAMA
// ============================================================

function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case "getProduct":
        result = getProduct(e.parameter.barcode);
        break;
      case "searchProduct":
        result = searchProduct(e.parameter.q);
        break;
      case "getAllProducts":
        result = getAllProducts();
        break;
      case "searchPelanggan":
        result = searchPelanggan(e.parameter.q);
        break;
      case "getHutangPelanggan":
        result = getHutangPelanggan(e.parameter.id);
        break;
      case "getAllHutang":
        result = getAllHutang();
        break;
      case "getDailyReport":
        result = getDailyReport(e.parameter.tgl);
        break;
      case "getTren7Hari":
        result = getTren7Hari(e.parameter.tgl);
        break;
      case "getKomposisiHariIni":
        result = getKomposisiHariIni(e.parameter.tgl);
        break;
      default:
        result = { error: "Action tidak dikenal: " + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;

    switch (action) {
      case "createTransaction":
        result = createTransaction(body);
        break;
      case "createPelanggan":
        result = createPelanggan(body);
        break;
      case "bayarCicilan":
        result = bayarCicilan(body);
        break;
      case "updateStok":
        result = updateStok(body);
        break;
      case "createProduct":
        result = createProduct(body);
        break;
      case "updateProduct":
        result = updateProduct(body);
        break;
      case "deleteProduct":
        result = deleteProduct(body);
        break;
      case "bulkCreateProduct":
        result = bulkCreateProduct(body);
        break;
      case "bulkUpdateProduct":
        result = bulkUpdateProduct(body);
        break;
      default:
        result = { error: "Action tidak dikenal: " + action };
    }

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// ============================================================
//  HELPER — SPREADSHEET
// ============================================================

function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      // Konversi Date ke string ISO agar bisa di-JSON-kan
      if (row[i] instanceof Date) {
        obj[h] = row[i].toISOString();
      } else {
        obj[h] = row[i];
      }
    });
    return obj;
  });
}

function getConfig(key) {
  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) return data[i][1];
  }
  return null;
}

function setConfig(key, value) {
  const sheet = getSheet("Config");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return;
    }
  }
}

function generateId(counterKey, prefix) {
  const current = parseInt(getConfig(counterKey)) + 1;
  setConfig(counterKey, current);
  const today = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyyMMdd");
  return `${prefix}-${today}-${String(current).padStart(3, "0")}`;
}

// ============================================================
//  PRODUK
// ============================================================

function getProduct(barcode) {
  if (!barcode) return { error: "Barcode wajib diisi" };

  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(barcode) && data[i][7] === true) {
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] = data[i][j];
      });
      obj["row"] = i + 1; // untuk update stok nanti
      return { success: true, data: obj };
    }
  }

  return { success: false, error: "Produk tidak ditemukan" };
}

function searchProduct(q) {
  if (!q || q.trim() === "") return { success: true, data: [] };

  const keyword = q.trim().toLowerCase();
  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][7] !== true) continue; // skip non-aktif
    const barcode = String(data[i][0]).toLowerCase();
    const nama = String(data[i][1]).toLowerCase();
    if (barcode.includes(keyword) || nama.includes(keyword)) {
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] = data[i][j];
      });
      obj["row"] = i + 1;
      results.push(obj);
    }
    if (results.length >= 10) break; // max 10 hasil
  }

  return { success: true, data: results };
}

function getAllProducts() {
  const sheet = getSheet("Produk");
  const all = sheetToObjects(sheet);
  const aktif = all.filter((p) => p.aktif === true);
  return { success: true, data: aktif };
}

function kurangiStok(barcode, qty) {
  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(barcode)) {
      const stokLama = data[i][4];
      const stokBaru = stokLama - qty;
      sheet.getRange(i + 1, 5).setValue(stokBaru);
      return stokBaru;
    }
  }
  return null;
}

function createProduct(body) {
  const {
    barcode,
    nama,
    harga,
    harga_beli,
    stok = 0,
    satuan,
    kategori,
    aktif = true,
  } = body;

  if (!barcode) return { error: "Barcode wajib diisi" };
  if (!nama) return { error: "Nama wajib diisi" };
  if (!harga) return { error: "Harga wajib diisi" };

  // Cek barcode duplikat
  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(barcode)) {
      return { error: "Barcode sudah digunakan" };
    }
  }

  sheet.appendRow([
    barcode,
    nama,
    Number(harga),
    Number(harga_beli),
    Number(stok),
    satuan,
    kategori,
    aktif,
  ]);

  return { success: true, data: { barcode, nama } };
}

function updateProduct(body) {
  const { barcode, nama, harga, harga_beli, satuan, kategori, aktif } = body;

  if (!barcode) return { error: "Barcode wajib diisi" };

  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(barcode)) {
      const row = i + 1; // 1-based
      if (nama !== undefined) sheet.getRange(row, 2).setValue(nama);
      if (harga !== undefined) sheet.getRange(row, 3).setValue(Number(harga));
      if (harga_beli !== undefined)
        sheet.getRange(row, 4).setValue(Number(harga_beli));
      if (satuan !== undefined) sheet.getRange(row, 6).setValue(satuan);
      if (kategori !== undefined) sheet.getRange(row, 7).setValue(kategori);
      if (aktif !== undefined) sheet.getRange(row, 8).setValue(aktif);
      return { success: true, data: { barcode } };
    }
  }
  return { error: "Produk tidak ditemukan" };
}

function deleteProduct(body) {
  const { barcode } = body;
  if (!barcode) return { error: "Barcode wajib diisi" };

  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(barcode)) {
      sheet.deleteRow(i + 1);
      return { success: true, data: { barcode } };
    }
  }
  return { error: "Produk tidak ditemukan" };
}

function bulkUpdateProduct(body) {
  const { products } = body;

  if (!products || products.length === 0)
    return { error: "List produk kosong" };

  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();

  const berhasil = [];
  const gagal = [];

  products.forEach((p) => {
    const { barcode, nama, harga, harga_beli, satuan, kategori, aktif } = p;

    if (!barcode) {
      gagal.push({ barcode, alasan: "Barcode kosong" });
      return;
    }

    // Cari baris
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(barcode)) {
        const row = i + 1;
        if (nama !== undefined) sheet.getRange(row, 2).setValue(nama);
        if (harga !== undefined) sheet.getRange(row, 3).setValue(Number(harga));
        if (harga_beli !== undefined)
          sheet.getRange(row, 4).setValue(Number(harga_beli));
        if (satuan !== undefined) sheet.getRange(row, 6).setValue(satuan);
        if (kategori !== undefined) sheet.getRange(row, 7).setValue(kategori);
        if (aktif !== undefined) sheet.getRange(row, 8).setValue(aktif);
        berhasil.push({ barcode });
        found = true;
        break;
      }
    }
    if (!found) gagal.push({ barcode, alasan: "Produk tidak ditemukan" });
  });

  return { success: true, data: { berhasil, gagal } };
}

function bulkCreateProduct(body) {
  const { products } = body;

  if (!products || products.length === 0)
    return { error: "List produk kosong" };

  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();

  // Ambil semua barcode yang sudah ada
  const existingBarcodes = data.slice(1).map((r) => String(r[0]));

  const berhasil = [];
  const gagal = [];

  products.forEach((p) => {
    const {
      barcode,
      nama,
      harga,
      harga_beli,
      stok = 0,
      satuan,
      kategori,
      aktif = true,
    } = p;

    // Validasi
    if (!barcode) {
      gagal.push({ barcode, alasan: "Barcode kosong" });
      return;
    }
    if (!nama) {
      gagal.push({ barcode, alasan: "Nama kosong" });
      return;
    }
    if (!harga) {
      gagal.push({ barcode, alasan: "Harga kosong" });
      return;
    }

    // Cek duplikat
    if (existingBarcodes.includes(String(barcode))) {
      gagal.push({ barcode, alasan: "Barcode sudah digunakan" });
      return;
    }

    // Insert
    sheet.appendRow([
      barcode,
      nama,
      Number(harga),
      Number(harga_beli),
      Number(stok),
      satuan,
      kategori,
      aktif,
    ]);

    // Tambah ke existing agar tidak duplikat sesama batch
    existingBarcodes.push(String(barcode));
    berhasil.push({ barcode, nama });
  });

  return {
    success: true,
    data: { berhasil, gagal },
  };
}

// ============================================================
//  PELANGGAN
// ============================================================

function searchPelanggan(q) {
  if (!q || q.trim() === "") {
    // Kembalikan semua jika query kosong
    const sheet = getSheet("Pelanggan");
    return { success: true, data: sheetToObjects(sheet) };
  }

  const keyword = q.trim().toLowerCase();
  const sheet = getSheet("Pelanggan");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const nama = String(data[i][1]).toLowerCase();
    const telp = String(data[i][2]).toLowerCase();
    const id = String(data[i][0]).toLowerCase();
    if (
      nama.includes(keyword) ||
      telp.includes(keyword) ||
      id.includes(keyword)
    ) {
      const obj = {};
      headers.forEach((h, j) => {
        obj[h] =
          data[i][j] instanceof Date ? data[i][j].toISOString() : data[i][j];
      });
      results.push(obj);
    }
  }

  return { success: true, data: results };
}

function createPelanggan(body) {
  const { nama, telp = "", alamat = "" } = body;
  if (!nama) return { error: "Nama pelanggan wajib diisi" };

  const sheet = getSheet("Pelanggan");
  const counter = parseInt(getConfig("counter_pel")) + 1;
  setConfig("counter_pel", counter);
  const id = "PEL-" + String(counter).padStart(3, "0");
  const tgl = new Date();

  sheet.appendRow([id, nama, telp, alamat, 0, tgl]);

  return { success: true, data: { id_pelanggan: id, nama, telp, alamat } };
}

function updateTotalHutangPelanggan(id_pelanggan) {
  // Rekap ulang total hutang aktif pelanggan
  const hutangSheet = getSheet("Hutang");
  const hutangData = hutangSheet.getDataRange().getValues();
  let total = 0;

  for (let i = 1; i < hutangData.length; i++) {
    if (hutangData[i][2] === id_pelanggan && hutangData[i][8] === "aktif") {
      total += hutangData[i][5]; // kolom sisa
    }
  }

  const pelSheet = getSheet("Pelanggan");
  const pelData = pelSheet.getDataRange().getValues();
  for (let i = 1; i < pelData.length; i++) {
    if (pelData[i][0] === id_pelanggan) {
      pelSheet.getRange(i + 1, 5).setValue(total);
      break;
    }
  }

  return total;
}

// ============================================================
//  TRANSAKSI
// ============================================================

function createTransaction(body) {
  const {
    items, // [{barcode, nama_produk, qty, harga_satuan}]
    metode_bayar, // "cash" | "tempo"
    kasir,
    diskon = 0,
    id_pelanggan = "",
    catatan = "",
    tgl_jatuh_tempo = "",
  } = body;

  if (!items || items.length === 0) return { error: "Keranjang kosong" };
  if (!metode_bayar) return { error: "Metode bayar wajib diisi" };
  if (metode_bayar === "tempo" && !id_pelanggan)
    return { error: "Pelanggan wajib dipilih untuk pembayaran tempo" };

  const id_trx = generateId("counter_trx", "TRX");
  const tgl = new Date();
  const subtotal = items.reduce(
    (sum, item) => sum + item.qty * item.harga_satuan,
    0,
  );
  const total = subtotal - diskon;
  const status = metode_bayar === "tempo" ? "hutang" : "lunas";

  // Simpan ke sheet Transaksi
  const trxSheet = getSheet("Transaksi");
  trxSheet.appendRow([
    id_trx,
    tgl,
    kasir || getConfig("nama_kasir"),
    subtotal,
    diskon,
    total,
    metode_bayar,
    status,
    id_pelanggan,
    catatan,
  ]);

  // Simpan ke sheet Detail_Trx
  const detailSheet = getSheet("Detail_Trx");
  items.forEach((item, idx) => {
    const id_detail = `${id_trx}-${String(idx + 1).padStart(2, "0")}`;
    const subtotalItem = item.qty * item.harga_satuan;
    const harga_beli = getHargaBeli(item.barcode);
    const laba_item = (item.harga_satuan - harga_beli) * item.qty;
    detailSheet.appendRow([
      id_detail,
      id_trx,
      item.barcode,
      item.nama_produk,
      item.qty,
      item.harga_satuan,
      subtotalItem,
      harga_beli,
      laba_item,
    ]);
    // Kurangi stok
    kurangiStok(item.barcode, item.qty);
  });

  // Jika tempo → simpan ke sheet Hutang
  let id_hutang = null;
  if (metode_bayar === "tempo") {
    id_hutang = generateId("counter_hutang", "HUT");
    const hutangSheet = getSheet("Hutang");
    const jatuhTempo = tgl_jatuh_tempo ? new Date(tgl_jatuh_tempo) : "";
    hutangSheet.appendRow([
      id_hutang,
      id_trx,
      id_pelanggan,
      total,
      0,
      total,
      tgl,
      jatuhTempo,
      "aktif",
    ]);
    updateTotalHutangPelanggan(id_pelanggan);
  }

  // Update sheet Kas
  updateKasHarian(
    tgl,
    metode_bayar,
    total,
    metode_bayar === "tempo" ? total : 0,
  );

  return {
    success: true,
    data: {
      id_trx,
      total,
      metode_bayar,
      status,
      id_hutang,
      id_pelanggan,
    },
  };
}

function getHargaBeli(barcode) {
  const sheet = getSheet("Produk");
  const data = sheetToObjects(sheet);
  const produk = data.find(
    (p) => String(p.barcode).trim() === String(barcode).trim(),
  );

  // Log untuk debug
  Logger.log(
    "Cari barcode: " +
      barcode +
      " | Ketemu: " +
      (produk ? produk.nama : "TIDAK KETEMU") +
      " | harga_beli: " +
      (produk ? produk.harga_beli : "-"),
  );

  return produk ? Number(produk.harga_beli) || 0 : 0;
}

// ============================================================
//  HUTANG & CICILAN
// ============================================================

function getHutangPelanggan(id_pelanggan) {
  if (!id_pelanggan) return { error: "ID pelanggan wajib diisi" };

  const hutangSheet = getSheet("Hutang");
  const hutangData = sheetToObjects(hutangSheet);
  const hutangAktif = hutangData.filter(
    (h) => h.id_pelanggan === id_pelanggan && h.status === "aktif",
  );

  const totalSisa = hutangAktif.reduce((sum, h) => sum + h.sisa, 0);

  // Ambil data pelanggan
  const pelSheet = getSheet("Pelanggan");
  const pelData = sheetToObjects(pelSheet);
  const pelanggan =
    pelData.find((p) => p.id_pelanggan === id_pelanggan) || null;

  return {
    success: true,
    data: {
      pelanggan,
      hutang: hutangAktif,
      total_sisa: totalSisa,
    },
  };
}

function getAllHutang() {
  const hutangSheet = getSheet("Hutang");
  const hutangData = sheetToObjects(hutangSheet);
  const aktif = hutangData.filter((h) => h.status === "aktif");

  // Gabungkan dengan nama pelanggan
  const pelSheet = getSheet("Pelanggan");
  const pelData = sheetToObjects(pelSheet);
  const pelMap = {};
  pelData.forEach((p) => {
    pelMap[p.id_pelanggan] = p.nama;
  });

  const result = aktif.map((h) => ({
    ...h,
    nama_pelanggan: pelMap[h.id_pelanggan] || "-",
  }));

  // Urutkan berdasarkan sisa hutang terbesar
  result.sort((a, b) => b.sisa - a.sisa);

  return { success: true, data: result };
}

function bayarCicilan(body) {
  const {
    id_hutang,
    id_pelanggan,
    jumlah,
    metode = "cash",
    kasir,
    catatan = "",
  } = body;

  if (!id_hutang) return { error: "ID hutang wajib diisi" };
  if (!jumlah || jumlah <= 0) return { error: "Jumlah bayar tidak valid" };

  const hutangSheet = getSheet("Hutang");
  const hutangData = hutangSheet.getDataRange().getValues();
  const headers = hutangData[0];

  let hutangRow = -1;
  let totalHutang = 0;
  let terbayarLama = 0;

  for (let i = 1; i < hutangData.length; i++) {
    if (hutangData[i][0] === id_hutang) {
      hutangRow = i + 1;
      totalHutang = hutangData[i][3];
      terbayarLama = hutangData[i][4];
      break;
    }
  }

  if (hutangRow === -1) return { error: "Data hutang tidak ditemukan" };

  const sisaLama = totalHutang - terbayarLama;
  const bayar = Math.min(jumlah, sisaLama); // tidak boleh lebih dari sisa
  const terbayarBaru = terbayarLama + bayar;
  const sisaBaru = totalHutang - terbayarBaru;
  const statusBaru = sisaBaru <= 0 ? "lunas" : "aktif";

  // Update sheet Hutang
  hutangSheet.getRange(hutangRow, 5).setValue(terbayarBaru); // kolom terbayar
  hutangSheet.getRange(hutangRow, 6).setValue(sisaBaru); // kolom sisa
  hutangSheet.getRange(hutangRow, 9).setValue(statusBaru); // kolom status

  // Simpan ke sheet Cicilan
  const id_cicilan = generateId("counter_cicilan", "CIL");
  const tgl = new Date();
  const cicilanSheet = getSheet("Cicilan");
  cicilanSheet.appendRow([
    id_cicilan,
    id_hutang,
    id_pelanggan,
    tgl,
    bayar,
    metode,
    kasir || getConfig("nama_kasir"),
    catatan,
  ]);

  // Update total hutang pelanggan
  updateTotalHutangPelanggan(id_pelanggan);

  // Update kas harian — cicilan masuk
  updateKasHarian(tgl, "cicilan", bayar, 0);

  return {
    success: true,
    data: {
      id_cicilan,
      id_hutang,
      jumlah_dibayar: bayar,
      sisa_hutang: sisaBaru,
      status: statusBaru,
    },
  };
}

// ============================================================
//  KAS HARIAN
// ============================================================

function updateKasHarian(tgl, metode, total, hutang_baru) {
  const kasSheet = getSheet("Kas");
  const kasData = kasSheet.getDataRange().getValues();
  const tglStr = Utilities.formatDate(
    new Date(tgl),
    "Asia/Jakarta",
    "yyyy-MM-dd",
  );

  // Cari baris hari ini
  let rowIdx = -1;
  for (let i = 1; i < kasData.length; i++) {
    const rowTgl = Utilities.formatDate(
      new Date(kasData[i][0]),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    if (rowTgl === tglStr) {
      rowIdx = i + 1;
      break;
    }
  }

  if (rowIdx === -1) {
    // Buat baris baru untuk hari ini
    kasSheet.appendRow([new Date(tgl), 0, 0, 0, 0, 0, 0, ""]);
    rowIdx = kasSheet.getLastRow();
  }

  // Ambil nilai sekarang
  const row = kasSheet.getRange(rowIdx, 1, 1, 8).getValues()[0];
  let cash = row[1];
  let qris = row[2];
  let cicilan = row[3];
  let hutangB = row[4];
  let jmlTrx = row[6];

  if (metode === "cash") {
    cash += total;
    jmlTrx++;
  }
  if (metode === "qris") {
    qris += total;
    jmlTrx++;
  }
  if (metode === "tempo") {
    hutangB += hutang_baru;
    jmlTrx++;
  }
  if (metode === "cicilan") {
    cicilan += total;
  }

  const omzet = cash + qris + cicilan;

  kasSheet
    .getRange(rowIdx, 2, 1, 6)
    .setValues([[cash, qris, cicilan, hutangB, omzet, jmlTrx]]);
}

// ============================================================
//  LAPORAN HARIAN
// ============================================================

function getDailyReport(tgl) {
  if (!tgl) {
    tgl = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  }

  // Data kas hari ini
  const kasSheet = getSheet("Kas");
  const kasData = sheetToObjects(kasSheet);
  const kasHariIni = kasData.find((k) => {
    const kTgl = Utilities.formatDate(
      new Date(k.tgl),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    return kTgl === tgl;
  }) || {
    cash_masuk: 0,
    qris_masuk: 0,
    cicilan_masuk: 0,
    hutang_baru: 0,
    total_omzet: 0,
    jumlah_trx: 0,
  };

  // Transaksi hari ini
  const trxSheet = getSheet("Transaksi");
  const trxData = sheetToObjects(trxSheet);
  const trxHariIni = trxData.filter((t) => {
    const tTgl = Utilities.formatDate(
      new Date(t.tgl),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    return tTgl === tgl;
  });
  // Detail transaksi untuk hitung laba
  const detailSheet = getSheet("Detail_Trx");
  const detailData = sheetToObjects(detailSheet);
  const detailHariIni = detailData.filter((d) => {
    const trxHariIniIds = trxHariIni.map((t) => t.id_trx);
    return trxHariIniIds.includes(d.id_trx);
  });
  const total_laba = detailHariIni.reduce(
    (sum, d) => sum + (Number(d.laba) || 0),
    0,
  );
  // Hutang baru hari ini
  const hutangSheet = getSheet("Hutang");
  const hutangData = sheetToObjects(hutangSheet);
  const hutangBaru = hutangData.filter((h) => {
    const hTgl = Utilities.formatDate(
      new Date(h.tgl_hutang),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    return hTgl === tgl;
  });

  // Cicilan hari ini
  const cicilanSheet = getSheet("Cicilan");
  const cicilanData = sheetToObjects(cicilanSheet);
  const cicilanHariIni = cicilanData.filter((c) => {
    const cTgl = Utilities.formatDate(
      new Date(c.tgl_bayar),
      "Asia/Jakarta",
      "yyyy-MM-dd",
    );
    return cTgl === tgl;
  });

  return {
    success: true,
    data: {
      tanggal: tgl,
      kas: kasHariIni,
      transaksi: trxHariIni,
      hutang_baru: hutangBaru,
      cicilan: cicilanHariIni,
      ringkasan: {
        total_omzet: kasHariIni.total_omzet || 0,
        cash_masuk: kasHariIni.cash_masuk || 0,
        qris_masuk: kasHariIni.qris_masuk || 0,
        cicilan_masuk: kasHariIni.cicilan_masuk || 0,
        hutang_baru: kasHariIni.hutang_baru || 0,
        jumlah_trx: kasHariIni.jumlah_trx || 0,
        total_laba: total_laba ?? 0,
      },
    },
  };
}
function updateStok(body) {
  const { barcode, jumlah, tipe } = body;
  if (!barcode) return { error: "Barcode wajib diisi" };
  if (!jumlah || jumlah <= 0) return { error: "Jumlah tidak valid" };

  const sheet = getSheet("Produk");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(barcode)) {
      const stokLama = data[i][4];
      let stokBaru;
      if (tipe === "tambah") stokBaru = stokLama + jumlah;
      else if (tipe === "kurangi") stokBaru = Math.max(0, stokLama - jumlah);
      else if (tipe === "set") stokBaru = jumlah;
      else return { error: "Tipe tidak valid" };

      sheet.getRange(i + 1, 5).setValue(stokBaru);
      return {
        success: true,
        data: { barcode, stok_lama: stokLama, stok_baru: stokBaru },
      };
    }
  }
  return { error: "Produk tidak ditemukan" };
}

// ============================================================
//  GRAFIK — TREN 7 HARI & KOMPOSISI
// ============================================================

function getTren7Hari(tgl) {
  const kasSheet = getSheet("Kas");
  // Pakai tgl sebagai titik akhir range, kalau kosong pakai hari ini
  const endDate = tgl ? new Date(tgl) : new Date();
  const kasData = sheetToObjects(kasSheet);
  const trxSheet = getSheet("Transaksi");
  const trxData = sheetToObjects(trxSheet);
  const detailSheet = getSheet("Detail_Trx");
  const detailData = sheetToObjects(detailSheet);

  const hariList = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const tglObj = new Date(endDate);
    tglObj.setDate(tglObj.getDate() - i);
    const tglStr = Utilities.formatDate(tglObj, "Asia/Jakarta", "yyyy-MM-dd");
    const hariNama = Utilities.formatDate(tglObj, "Asia/Jakarta", "EEE");

    // Omzet dari sheet Kas
    const kasHari = kasData.find((k) => {
      try {
        const tglObj = k.tgl instanceof Date ? k.tgl : new Date(k.tgl);
        const kTgl = Utilities.formatDate(tglObj, "Asia/Jakarta", "yyyy-MM-dd");
        return kTgl === tglStr;
      } catch {
        return false;
      }
    });
    const omzet = kasHari ? Number(kasHari.total_omzet) || 0 : 0;

    // Laba dari sheet Transaksi → Detail_Trx
    const trxHari = trxData.filter((t) => {
      try {
        const tglObj = t.tgl instanceof Date ? t.tgl : new Date(t.tgl);
        const tTgl = Utilities.formatDate(tglObj, "Asia/Jakarta", "yyyy-MM-dd");
        return tTgl === tglStr;
      } catch {
        return false;
      }
    });
    const trxIds = trxHari.map((t) => t.id_trx);
    const detailHari = detailData.filter((d) => trxIds.includes(d.id_trx));
    const laba = detailHari.reduce((sum, d) => {
      const v = Number(d.laba);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    hariList.push({ tanggal: tglStr, hari: hariNama, omzet, laba });
  }

  return { success: true, data: hariList };
}

function getKomposisiHariIni(tgl) {
  const kasSheet = getSheet("Kas");
  const kasData = sheetToObjects(kasSheet);

  // Pakai tanggal dari parameter, kalau kosong pakai hari ini
  const today =
    tgl || Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

  const kasHari = kasData.find((k) => {
    try {
      const tglObj = k.tgl instanceof Date ? k.tgl : new Date(k.tgl);
      const kTgl = Utilities.formatDate(tglObj, "Asia/Jakarta", "yyyy-MM-dd");
      return kTgl === today;
    } catch {
      return false;
    }
  });

  const cash = kasHari ? Number(kasHari.cash_masuk) || 0 : 0;
  const qris = kasHari ? Number(kasHari.qris_masuk) || 0 : 0;
  const cicilan = kasHari ? Number(kasHari.cicilan_masuk) || 0 : 0;
  const tempo = kasHari ? Number(kasHari.hutang_baru) || 0 : 0;

  return {
    success: true,
    data: [
      { nama: "Cash", nilai: cash },
      { nama: "QRIS", nilai: qris },
      { nama: "Cicilan", nilai: cicilan },
      { nama: "Tempo", nilai: tempo },
    ],
  };
}
