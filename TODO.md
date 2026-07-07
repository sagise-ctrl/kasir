# TODO

## HalamanProduk: Filter stok (Stok Habis / Stok Menipis)

- [x] Baca `src/pages/HalamanProduk.jsx` dan identifikasi bagian kartu stok.
- [ ] Tambah state `filterStok`.
- [ ] Ubah kartu stok menjadi tombol/clickable dengan toggle dan indikator aktif.
- [ ] Update `useMemo filtered` untuk memasukkan filter stok.
- [ ] (Opsional) Reset `filterStok` ke `null` saat `kategori` berubah.
- [ ] Pastikan perubahan hanya di `src/pages/HalamanProduk.jsx`.
- [ ] Jalankan build/dev untuk cek error.
- [ ] Pastikan kartu stok menunjukkan indikator aktif (ring/border) dan toggle off.

---

## Android (Capacitor) dari Web - 1 Codebase (TRACKING)

- [ ] 1. Tambah konfigurasi Capacitor (capacitor.config.\*) untuk Android + web assets (dist/)
- [ ] 2. Inisialisasi project Android via Capacitor (membuat folder `android/` dan Gradle files) — terpisah dari web
- [ ] 3. Tambah GitHub Actions workflow: build web → sync capacitor android → build APK debug → upload artifact
- [ ] 4. Integrasi scanner Android sebagai layer terpisah (wiring minimal) tanpa mengubah business logic
- [ ] 5. Pastikan web tetap berjalan (npm run build)
- [ ] 6. Validasi CI artifact APK debug bisa diunduh dari tab Actions
