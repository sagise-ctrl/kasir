import { useState, useRef, useEffect } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";
import { Capacitor } from "@capacitor/core";

import { MlkitBarcodeScanner } from "../../plugins/mlkit-barcode-scanner/src/index";

/**
 * Scanner adapter:
 * - Web: ZXing + getUserMedia (video DOM)
 * - Android (Capacitor): native ML Kit via MlkitBarcodeScanner + event 'barcodeDetected'
 *
 * Business logic unchanged: always calls onBarcodeDetected(barcode).
 */
export function useBarcodeScanner(onBarcodeDetected) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");

  // Web ZXing video element
  const videoRef = useRef(null);

  // Web ZXing refs
  const readerRef = useRef(null);
  const streamRef = useRef(null);
  const focusIntervalRef = useRef(null);
  const scanningRef = useRef(false);
  const lastDetectionTimeRef = useRef(0);

  // Android native listener handle
  const androidListenerRef = useRef(null);

  const isAndroidCapacitor = () => Capacitor.isNativePlatform?.() === true;

  const canVibrate = () =>
    typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

  function createOptimizedReader() {
    const hints = new Map();

    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ]);

    hints.set(DecodeHintType.TRY_HARDER, false);
    hints.set(DecodeHintType.PURE_BARCODE, true);
    hints.set(DecodeHintType.ALLOW_EAN_EXTENSIONS, false);

    return new BrowserMultiFormatReader(hints);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Web (ZXing)
  // ─────────────────────────────────────────────────────────────────────
  async function startCameraWeb() {
    setError("");
    scanningRef.current = true;

    try {
      readerRef.current = createOptimizedReader();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 },
          advanced: [
            { focusMode: "manual", zoom: 1.0 },
            { focusMode: "continuous" },
            { focusMode: "auto" },
          ],
        },
      });

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack?.getCapabilities?.()) {
        const caps = videoTrack.getCapabilities();

        if (caps.focusMode?.includes("continuous")) {
          await videoTrack.applyConstraints({
            advanced: [{ focusMode: "continuous" }],
          });
        }

        if (focusIntervalRef.current) clearInterval(focusIntervalRef.current);
        focusIntervalRef.current = setInterval(async () => {
          try {
            await videoTrack
              .applyConstraints({
                advanced: [{ focusMode: "continuous" }],
              })
              .catch(() => {});
          } catch {}
        }, 5000);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;

      await readerRef.current.decodeFromStream(
        stream,
        videoRef.current,
        (result) => {
          const now = Date.now();
          if (!result || !scanningRef.current) return;
          if (now - lastDetectionTimeRef.current < 500) return;

          lastDetectionTimeRef.current = now;
          scanningRef.current = false;

          const barcode = result.getText();

          if (canVibrate()) navigator.vibrate(50);
          onBarcodeDetected?.(barcode);
        },
      );
    } catch (err) {
      setError(`Error camera: ${err?.message || String(err)}`);
      console.error("Camera error:", err);
      stopCameraWeb();
    }
  }

  function stopCameraWeb() {
    scanningRef.current = false;

    if (focusIntervalRef.current) {
      clearInterval(focusIntervalRef.current);
      focusIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (e) {
        console.warn("Reader reset error:", e);
      }
      readerRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  }

  // ─────────────────────────────────────────────────────────────────────
  // Android (Native ML Kit via Capacitor plugin)
  // ─────────────────────────────────────────────────────────────────────
  async function startScanAndroidNative() {
    setError("");
    scanningRef.current = true;

    try {
      const perm = await MlkitBarcodeScanner.requestCameraPermission();
      if (!perm?.granted) {
        setError("Izin kamera ditolak");
        scanningRef.current = false;
        return;
      }

      if (!androidListenerRef.current) {
        androidListenerRef.current = await MlkitBarcodeScanner.addListener(
          "barcodeDetected",
          ({ barcode }) => {
            const now = Date.now();
            if (!barcode) return;
            if (now - lastDetectionTimeRef.current < 500) return;

            lastDetectionTimeRef.current = now;
            if (canVibrate()) navigator.vibrate(50);

            onBarcodeDetected?.(barcode);
          },
        );
      }

      await MlkitBarcodeScanner.startScan();
    } catch (err) {
      setError(err?.message ? String(err.message) : "Error native scan");
      console.error("Android scan error:", err);
      scanningRef.current = false;
    }
  }

  async function stopScanAndroidNative() {
    scanningRef.current = false;

    try {
      if (androidListenerRef.current?.remove) {
        androidListenerRef.current.remove();
      }
    } catch {}

    androidListenerRef.current = null;

    try {
      await MlkitBarcodeScanner.stopScan();
    } catch {}

    setIsScanning(false);
  }

  // Lifecycle
  useEffect(() => {
    return () => {
      stopCameraWeb();
      stopScanAndroidNative();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    isScanning,
    error,
    startScanning: async () => {
      setIsScanning(true);
      if (isAndroidCapacitor()) {
        await startScanAndroidNative();
      } else {
        await startCameraWeb();
      }
    },
    stopScanning: async () => {
      if (isAndroidCapacitor()) {
        await stopScanAndroidNative();
      } else {
        stopCameraWeb();
      }
    },
  };
}
