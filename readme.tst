# Kasir - Aplikasi Point of Sale (POS) Berbasis Web

## 📋 Deskripsi

**Kasir** adalah aplikasi Point of Sale (POS) berbasis web yang modern dan responsif, dirancang khusus untuk kebutuhan transaksi penjualan di toko, warung, atau usaha retail. Aplikasi ini dibangun menggunakan **React** dengan **Vite** sebagai build tool, serta **Tailwind CSS** untuk styling yang cepat dan konsisten.

Aplikasi ini mendukung berbagai fitur penting seperti:
- Transaksi penjualan dengan scan barcode
- Manajemen produk dan stok
- Pencatatan hutang pelanggan
- Laporan harian
- Dukungan pembayaran cash dan tempo
- **Mode offline** dengan sinkronisasi otomatis saat online

---

## 🚀 Fitur Utama

### 1. **Halaman Kasir**
- Pencarian produk dengan debounce (delay 400ms)
- Scan barcode menggunakan kamera (webcam)
- Dukungan hardware barcode scanner (deteksi input cepat)
- Keranjang belanja interaktif
- Input diskon manual
- Pembayaran multi-metode (Cash & Tempo)
- Perhitungan kembalian otomatis
- Quick select nominal uang (5.000, 10.000, 20.000, 50.000, 100.000)

### 2. **Halaman Produk**
- Daftar semua produk dengan filter kategori
- Pencarian berdasarkan nama atau barcode
- Indikator status stok (Habis, Menipis, Aman)
- Notifikasi produk stok habis dan menipis (≤5)
- Kelola stok dengan 3 opsi:
  - Tambah stok (restok dari supplier)
  - Kurangi stok (koreksi/barang hilang/rusak)
  - Set manual (atur ke angka tertentu)
- Preview stok setelah perubahan

### 3. **Halaman Hutang**
- Daftar semua hutang aktif
- Summary total piutang dan jumlah pelanggan berhutang
- Progress bar pembayaran per pelanggan
- Bayar cicilan dengan metode Cash atau QRIS
- Opsi bayar lunas sekaligus

### 4. **Halaman Laporan**
- Laporan harian berdasarkan tanggal
- Ringkasan omzet, cash masuk, cicilan, hutang baru
- Daftar transaksi per hari
- Daftar hutang baru hari ini
- Daftar cicilan diterima hari ini

### 5. **Halaman Pengaturan**
- Set nama kasir (disimpan di localStorage)
- Info sistem (versi, backend, database)

---

## 📁 Struktur Folder

```
kasir/
├── index.html                 # HTML entry point
├── package.json               # Dependencies & scripts
├── package-lock.json          # Lock file dependencies
├── vite.config.js             # Konfigurasi Vite
├── tailwind.config.js         # Konfigurasi Tailwind CSS
├── postcss.config.js          # Konfigurasi PostCSS
├── vercel.json                # Konfigurasi deploy Vercel
│
└── src/
    ├── main.jsx               # Entry point React
    ├── App.jsx                # Komponen utama (routing & layout)
    ├── index.css              # Global styles & Tailwind directives
    │
    ├── pages/                 # Halaman-halaman aplikasi
    │   ├── HalamanKasir.jsx       # Halaman transaksi utama
    │   ├── HalamanProduk.jsx      # Halaman manajemen produk
    │   ├── HalamanHutang.jsx      # Halaman manajemen hutang
    │   ├── HalamanLaporan.jsx     # Halaman laporan harian
    │   └── HalamanPengaturan.jsx  # Halaman pengaturan
    │
    ├── components/            # Komponen reusable
    │   ├── CariProduk.jsx         # Input pencarian & scan barcode
    │   ├── Keranjang.jsx          # Komponen keranjang belanja
    │   ├── ModalBayar.jsx         # Modal pembayaran
    │   └── UI.jsx                 # Komponen UI dasar (Btn, Card, Modal, dll)
    │
    ├── context/               # React Context
    │   └── KeranjangContext.jsx   # State management keranjang
    │
    ├── utils/                 # Fungsi utilitas
    │   ├── api.js                 # API calls ke Google Apps Script
    │   ├── db.js                  # IndexedDB operations (Dexie)
    │   ├── format.js              # Format helper (rupiah, tanggal, jam)
    │   └── networkStatus.js       # Shared online/offline status
    │
    └── hooks/                 # Custom hooks (jika ada)
```

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Versi | Fungsi |
|-----------|-------|--------|
| React | 18.3.1 | Framework UI |
| Vite | 5.4.10 | Build tool & dev server |
| Tailwind CSS | 3.4.14 | Utility-first CSS framework |
| ZXing Browser | 0.2.0 | Barcode/QR scanner via kamera |
| ZXing Library | 0.22.0 | Core barcode decoding |
| Autoprefixer | 10.4.20 | CSS vendor prefix |
| PostCSS | 8.4.47 | CSS processing |

### Backend & Database
- **Google Apps Script** - API endpoint
- **Google Sheets** - Database penyimpanan data
- **IndexedDB (Dexie)** - Cache lokal untuk mode offline

---

## 🔧 Cara Instalasi & Menjalankan

### Prasyarat
- Node.js (versi 16 atau lebih tinggi)
- npm atau yarn

### Langkah-langkah

1. **Clone repository**
   ```bash
   git clone https://github.com/sagise-ctrl/web.git
   cd kasir
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Jalankan development server**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:5173`

4. **Build for production**
   ```bash
   npm run build
   ```

5. **Preview production build**
   ```bash
   npm run preview
   ```

---

## 📡 API & Backend

Aplikasi ini terhubung ke **Google Apps Script** sebagai backend API. Base URL:
```
https://script.google.com/macros/s/AKfycbwVEHwdCKAa2w9fbthBbgZpy3ic2vCWwuypQZqKckilKnAbfFaT-MnGrRaHnSypLbraYw/exec
```

### API Methods

#### Produk
| Method | Fungsi | Parameter |
|--------|--------|-----------|
| GET | `getProduct(barcode)` | barcode |
| GET | `searchProduct(q)` | query pencarian |
| GET | `getAllProducts()` | - |
| POST | `updateStok(barcode, tipe, jumlah)` | barcode, tipe, jumlah |

#### Pelanggan
| Method | Fungsi | Parameter |
|--------|--------|-----------|
| GET | `searchPelanggan(q)` | query pencarian |
| POST | `createPelanggan(body)` | nama, telp |

#### Transaksi
| Method | Fungsi | Parameter |
|--------|--------|-----------|
| POST | `createTransaction(body)` | items, metode_bayar, kasir, diskon, id_pelanggan |

#### Hutang
| Method | Fungsi | Parameter |
|--------|--------|-----------|
| GET | `getHutangPelanggan(id)` | id_pelanggan |
| GET | `getAllHutang()` | - |
| POST | `bayarCicilan(body)` | id_hutang, id_pelanggan, jumlah, metode, kasir |

#### Laporan
| Method | Fungsi | Parameter |
|--------|--------|-----------|
| GET | `getDailyReport(tgl)` | tanggal (opsional) |

---

## 🎨 Desain & UI/UX

### Responsive Design
- **Desktop**: Layout 2 kolom untuk halaman kasir, navigasi horizontal di header
- **Mobile**: Layout 1 kolom, navigasi bottom bar, tab switcher untuk cari/keranjang

### Komponen UI (UI.jsx)
- **Spinner** - Loading indicator animasi
- **Badge** - Label dengan berbagai warna (blue, green, red, yellow, gray, orange)
- **EmptyState** - Tampilan ketika tidak ada data
- **Card** - Container dengan shadow & border
- **Btn** - Button with variant (primary, success, danger, ghost, outline, warning) & size (sm, md, lg)
- **Input** - Input field with label
- **Modal** - Dialog overlay with backdrop blur

### Format Helper (format.js)
- `rupiahFormat(num)` - Format angka ke Rupiah (Rp)
- `tglFormat(str)` - Format tanggal Indonesia (contoh: "17 Mei 2026")
- `jamFormat(str)` - Format jam (contoh: "14:30")
- `tglInputFormat(date)` - Format tanggal untuk input date (YYYY-MM-DD)

---

## 🔄 Cara Kerja Aplikasi

### Flow Transaksi Penjualan

1. **Pencarian Produk**
   - User mengetik nama produk atau scan barcode
   - Sistem mencari produk dengan debounce 400ms
   - Hasil ditampilkan dalam dropdown

2. **Tambah ke Keranjang**
   - Produk dipilih, otomatis masuk keranjang
   - Quantity default = 1
   - Jika produk sudah ada, quantity ditambah

3. **Kelola Keranjang**
   - Ubah quantity (+/- atau input manual)
   - Hapus item
   - Set diskon manual
   - Lihat subtotal & total

4. **Pembayaran**
   - Pilih metode (Cash / Tempo)
   - **Cash**: Input uang diterima, hitung kembalian otomatis
   - **Tempo**: Pilih/tambah pelanggan, transaksi jadi hutang
   - Konfirmasi pembayaran

5. **Selesai**
   - Tampilkan struk transaksi
   - Keranjang dikosongkan
   - Siap untuk transaksi baru

### Flow Manajemen Stok

1. Buka halaman Produk
2. Lihat daftar produk dengan status stok
3. Klik "Kelola Stok" pada produk
4. Pilih tipe operasi (Tambah/Kurangi/Set)
5. Input jumlah
6. Lihat preview stok setelah perubahan
7. Simpan

---

## 💾 State Management

### KeranjangContext
State global untuk keranjang belanja menggunakan `useReducer`:

```javascript
{
  items: [],      // Array produk di keranjang
  diskon: 0,      // Diskon dalam Rupiah
  subtotal: 0,    // Total sebelum diskon
  total: 0        // Total setelah diskon
}
```

**Actions:**
- `TAMBAH` - Tambah produk (atau +1 jika sudah ada)
- `KURANGI` - Kurangi qty, hapus jika jadi 0
- `HAPUS` - Hapus produk dari keranjang
- `SET_QTY` - Set quantity spesifik
- `KOSONGKAN` - Kosongkan keranjang & diskon
- `SET_DISKON` - Set nilai diskon

---

## 🌐 Deploy

Aplikasi siap di-deploy ke **Vercel** dengan konfigurasi yang sudah tersedia di `vercel.json`.

### Langkah Deploy:
1. Push code ke GitHub
2. Hubungkan repository ke Vercel
3. Deploy otomatis

---

## 📱 Fitur Khusus

### 1. Barcode Scanner
- **Kamera**: Menggunakan ZXing Browser untuk scan via webcam
- **Hardware Scanner**: Mendeteksi input cepat (< 60ms) dan Enter untuk mengidentifikasi hardware scanner
- **Auto-focus**: Input field selalu auto-focus untuk kemudahan scan

### 2. Mobile-First Design
- Bottom navigation untuk mobile
- Tab switcher antara "Cari Produk" dan "Keranjang"
- Touch-friendly buttons & inputs

### 3. LocalStorage
- Menyimpan nama kasir di localStorage
- Persistensi sederhana tanpa backend auth

### 4. Mode Offline (Terbaru)
- **Auto-sync data**: Produk & hutang di-cache ke IndexedDB saat online
- **Deteksi koneksi real**: Ping ke server untuk cek status online/offline yang akurat
- **Sinkronisasi otomatis**: Transaksi offline disimpan di queue, auto-sync saat online
- **Indikator status**: Tampilan status cache di header (syncing/ready/empty)

---

## 📝 Catatan Penting

1. **API Endpoint**: Saat ini terhubung ke Google Apps Script tertentu. Untuk penggunaan sendiri, perlu setup Google Apps Script & Google Sheets sendiri.

2. **QRIS**: Fitur QRIS ditampilkan di UI tetapi belum aktif (status: "Belum aktif").

3. **Database**: Semua data (produk, transaksi, hutang, pelanggan) disimpan di Google Sheets melalui Google Apps Script.

4. **Keamanan**: Tidak ada autentikasi user. Nama kasir hanya disimpan di localStorage browser.

5. **Mode Offline**: 
   - Data produk & hutang di-cache saat online untuk akses offline
   - Transaksi offline disimpan di queue dan auto-sync saat koneksi kembali
   - Status cache ditampilkan di header untuk informasi user

---

## 🔄 Changelog

### Versi Terbaru
- ✅ **Fix dropdown CariProduk**: Dropdown hasil search sekarang fixed position, tidak terpotong di mobile
- ✅ **Deteksi online/offline real**: Menggunakan ping ke server (bukan navigator.onLine)
- ✅ **Shared network status**: Status online/offline sinkron antara App.jsx dan api.js
- ✅ **Loading screen**: Tampilan loading saat app pertama buka hingga koneksi terdeteksi
- ✅ **Auto-sync data**: Produk & hutang otomatis di-cache saat online
- ✅ **Indikator cache status**: Tampilan status "Online", "Offline siap", "Mengunduh data", dll di header
- ✅ **Normalisasi data**: Barcode dikonversi ke string, stok ke number untuk kompatibilitas IndexedDB
- ✅ **Format response konsisten**: Response API online/offline memiliki format yang sama

---

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b fitur/baru`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin fitur/baru`)
5. Buat Pull Request

---

## 📄 License

Repository ini bersifat privat.

---

## 📞 Kontak

Repository: https://github.com/sagise-ctrl/web.git

---

**Dibuat dengan ❤️ menggunakan React + Vite + Tailwind CSS**