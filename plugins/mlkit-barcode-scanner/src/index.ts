import { registerPlugin } from "@capacitor/core";

export type BarcodeScanOptions = {
  /**
   * Array nama format (mis. "EAN_13", "EAN_8", "UPCA", "UPCE", "CODE_128")
   * Jika kosong/undefined: plugin akan pakai default format retail.
   */
  formats?: string[];
};

export type CameraPermissionResult = {
  granted: boolean;
};

export type BarcodeScanResult = {
  barcode: string;
};

export interface MlkitBarcodeScannerPlugin {
  /**
   * Mulai scanning kamera native menggunakan ML Kit.
   * Resolves ketika activity kamera sudah dimulai.
   * Hasil barcode dikirim via event 'barcodeDetected'.
   */
  startScan(options?: BarcodeScanOptions): Promise<void>;

  /** Hentikan scanning & release camera. */
  stopScan(): Promise<void>;

  /** Minta permission CAMERA (runtime). */
  requestCameraPermission(): Promise<CameraPermissionResult>;

  /**
   * Event ketika barcode terdeteksi.
   * Payload: { barcode: string }
   */
  addListener(
    eventName: "barcodeDetected",
    listener: (payload: BarcodeScanResult) => void,
  ): Promise<{ remove: () => void }>;
}

export const MlkitBarcodeScanner = registerPlugin<MlkitBarcodeScannerPlugin>(
  "MlkitBarcodeScanner",
);
