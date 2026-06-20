import { useState, useRef, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { api } from "../utils/api";
import { rupiahFormat } from "../utils/format";
import { Spinner } from "./UI";

export function CariProduk({ onPilih, onQueryChange }) {
  const [query, setQuery] = useState("");
  const [hasil, setHasil] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scanError, setScanError] = useState("");
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const scanningRef = useRef(false);
  const containerRef = useRef(null);
  const streamRef = useRef(null);
  const focusInterval = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // Informasikan query ke parent agar bisa menampilkan UI kondisi tertentu
  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  // Search produk dengan debounce
  useEffect(() => {
    // Langsung kosongkan kalau query kosong
    if (query.trim().length === 0) {
      clearTimeout(debounceRef.current);
      setHasil([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.searchProduct(query.trim());
        // Double check: kalau query sudah kosong saat hasil datang, jangan tampilkan
        setHasil((prev) => (query.trim().length === 0 ? [] : res.data || []));
      } catch {
        setHasil([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  // Hitung posisi dropdown saat hasil search muncul
  useEffect(() => {
    if (hasil.length > 0 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [hasil]);

  // Mulai/stop kamera saat scanMode berubah
  useEffect(() => {
    if (scanMode) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scanMode]);

  async function startCamera() {
    setScanError("");
    scanningRef.current = true;
    try {
      readerRef.current = new BrowserMultiFormatReader();

      // Minta stream dengan constraint autofocus
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" }, { zoom: 1.0 }],
        },
      });

      // Paksa autofocus di track video
      const track = stream.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          });
        } catch {}
      }

      // Tempel stream ke video element
      videoRef.current.srcObject = stream;

      // Simpan stream untuk cleanup
      streamRef.current = stream;

      // Paksa autofocus tiap 2 detik
      focusInterval.current = setInterval(async () => {
        if (track && track.applyConstraints) {
          try {
            await track.applyConstraints({
              advanced: [{ focusMode: "continuous" }],
            });
          } catch {}
        }
      }, 2000);

      // Mulai decode dengan ZXing
      await readerRef.current.decodeFromStream(
        stream,
        videoRef.current,
        async (result, err) => {
          if (result && scanningRef.current) {
            scanningRef.current = false;
            const barcode = result.getText();
            setScanMode(false);
            await cariBarcode(barcode);
          }
        },
      );
    } catch (e) {
      setScanError("Gagal akses kamera: " + e.message);
      setScanMode(false);
    }
  }

  function stopCamera() {
    scanningRef.current = false;

    // Stop focus interval
    if (focusInterval.current) {
      clearInterval(focusInterval.current);
      focusInterval.current = null;
    }

    // Stop stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Reset ZXing reader
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {}
      readerRef.current = null;
    }
  }

  // Deteksi scanner hardware (input cepat + Enter)
  const lastKeyTime = useRef(0);
  const barcodeBuffer = useRef("");

  function handleKeyDown(e) {
    const now = Date.now();
    if (e.key === "Enter") {
      if (now - lastKeyTime.current < 60 && barcodeBuffer.current.length > 4) {
        const barcode = barcodeBuffer.current;
        barcodeBuffer.current = "";
        setQuery("");
        setHasil([]);
        e.preventDefault();
        cariBarcode(barcode);
        return;
      }
      barcodeBuffer.current = "";
    } else {
      barcodeBuffer.current =
        now - lastKeyTime.current < 60 ? barcodeBuffer.current + e.key : e.key;
    }
    lastKeyTime.current = now;
  }

  async function cariBarcode(barcode) {
    setLoading(true);
    try {
      const res = await api.getProduct(barcode);
      if (res.success) {
        pilih(res.data);
      } else {
        alert("Produk tidak ditemukan: " + barcode);
        inputRef.current?.focus();
        scanningRef.current = true; // boleh scan lagi
      }
    } catch (e) {
      alert("Error: " + e.message);
      scanningRef.current = true;
    } finally {
      setLoading(false);
    }
  }

  function pilih(produk) {
    const stok = Number(produk.stok) || 0;
    if (stok === 0) {
      alert(`Stok ${produk.nama} habis, tidak bisa ditambah ke keranjang`);
      inputRef.current?.focus();
      return;
    }
    onPilih(produk);
    setQuery("");
    setHasil([]);
    inputRef.current?.focus();
  }

  return (
    <div className="relative space-y-3">
      {/* Input bar */}
      <div ref={containerRef} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {loading ? <Spinner size={16} /> : "🔍"}
          </span>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim() === "") setHasil([]);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Scan barcode atau ketik nama produk..."
            className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm
                       focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent
                       bg-white shadow-sm"
          />
        </div>

        {/* Tombol kamera */}
        <button
          onClick={() => setScanMode((v) => !v)}
          title="Scan pakai kamera"
          className={`px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
            scanMode
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-white border-gray-200 text-gray-500 hover:border-indigo-400"
          }`}
        >
          📷
        </button>
      </div>

      {/* Error kamera */}
      {scanError && (
        <div className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2">
          {scanError}
        </div>
      )}

      {/* Viewfinder kamera */}
      {scanMode && (
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-lg">
          <video
            ref={videoRef}
            className="w-full max-h-64 object-cover"
            autoPlay
            playsInline
            muted
          />
          {/* Overlay crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-32 border-2 border-white/70 rounded-lg relative">
              {/* Sudut */}
              {[
                "top-0 left-0",
                "top-0 right-0",
                "bottom-0 left-0",
                "bottom-0 right-0",
              ].map((pos, i) => (
                <div
                  key={i}
                  className={`absolute w-5 h-5 border-indigo-400 ${pos} ${
                    i < 2 ? "border-t-2" : "border-b-2"
                  } ${i % 2 === 0 ? "border-l-2" : "border-r-2"}`}
                />
              ))}
              {/* Garis scan animasi */}
              <div className="absolute left-0 right-0 h-0.5 bg-indigo-400/80 animate-scan" />
            </div>
          </div>
          {/* Tombol tutup */}
          <button
            onClick={() => setScanMode(false)}
            className="absolute top-3 right-3 bg-black/50 text-white rounded-full
                       w-8 h-8 flex items-center justify-center text-sm hover:bg-black/70"
          >
            ✕
          </button>
          <div className="absolute bottom-3 left-0 right-0 text-center text-white/80 text-xs">
            Arahkan kamera ke barcode
          </div>
        </div>
      )}

      {/* Dropdown hasil search */}
      {!scanMode && hasil.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
          }}
          className="z-[9999] bg-white border border-gray-100 rounded-xl shadow-lg overflow-y-auto max-h-[50vh]"
        >
          {hasil.map((p) => {
            const stokNum = Number(p.stok) || 0;
            const stokHabis = stokNum === 0;
            const stokMenipis = stokNum > 0 && stokNum <= 5;

            return (
              <button
                key={p.barcode}
                onClick={() => !stokHabis && pilih(p)}
                disabled={stokHabis}
                className={`w-full flex items-center justify-between px-4 py-3
                           transition-colors border-b border-gray-50 last:border-0
                           ${
                             stokHabis
                               ? "opacity-50 cursor-not-allowed bg-gray-50"
                               : "hover:bg-indigo-50"
                           }`}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800 text-sm">
                      {p.nama}
                    </span>
                    {stokHabis && (
                      <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        Habis
                      </span>
                    )}
                    {stokMenipis && (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                        Menipis
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    {p.barcode} · Stok: {p.stok} {p.satuan}
                  </div>
                </div>
                <div
                  className={`text-sm font-bold whitespace-nowrap ml-4 ${
                    stokHabis ? "text-gray-400" : "text-indigo-600"
                  }`}
                >
                  {rupiahFormat(p.harga)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {!scanMode && query.length > 0 && hasil.length === 0 && !loading && (
        <div
          className="absolute top-14 left-0 right-0 z-30 bg-white border border-gray-100
                        rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400"
        >
          Produk tidak ditemukan
        </div>
      )}
    </div>
  );
}
