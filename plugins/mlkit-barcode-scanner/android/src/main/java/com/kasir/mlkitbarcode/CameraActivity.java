package com.kasir.mlkitbarcode;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageAnalysis;
import androidx.camera.core.ImageProxy;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.lifecycle.LifecycleOwner;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.common.util.concurrent.ListenableFuture;
import com.google.mlkit.vision.barcode.Barcode;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.common.InputImage;

import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.camera.core.Preview;
import androidx.camera.core.Camera;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import java.util.List;

public class CameraActivity extends android.app.Activity {

    public static final String EXTRA_IS_BACKGROUND = "is_background";
    public static final String EXTRA_SCANNER_SESSION_ID = "session_id";
    public static final int CAMERA_PERMISSION_REQ = 73422;

    private static final String TAG = "CameraActivity";

    private PreviewView previewView;
    private ProcessCameraProvider cameraProvider;
    private Camera camera;
    private boolean scanning = true;

    private BarcodeScanner barcodeScanner;
    private String sessionId;

    /** Receiver to close this activity when stopScan is called from JS. */
    private BroadcastReceiver stopReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        sessionId = getIntent().getStringExtra(EXTRA_SCANNER_SESSION_ID);

        FrameLayout root = new FrameLayout(this);
        root.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        previewView = new PreviewView(this);
        previewView.setLayoutParams(new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.addView(previewView);
        setContentView(root);

        initScanner();

        // Register receiver to listen for stopScan command from plugin
        registerStopReceiver();

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQ);
            return;
        }

        startCamera();
    }

    private void initScanner() {
        barcodeScanner = BarcodeScanning.getClient();
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                ProcessCameraProvider.getInstance(this);

        cameraProviderFuture.addListener(() -> {
            try {
                cameraProvider = cameraProviderFuture.get();
                bindUseCases();
            } catch (Exception e) {
                Log.e(TAG, "Camera provider error", e);
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindUseCases() {
        if (cameraProvider == null) return;

        Preview preview = new Preview.Builder().build();
        preview.setSurfaceProvider(previewView.getSurfaceProvider());

        ImageAnalysis imageAnalysis = new ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build();

        imageAnalysis.setAnalyzer(ContextCompat.getMainExecutor(this), this::analyzeImage);

        CameraSelector cameraSelector = new CameraSelector.Builder()
                .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                .build();

        cameraProvider.unbindAll();
        camera = cameraProvider.bindToLifecycle((LifecycleOwner) this, cameraSelector, preview, imageAnalysis);
    }

    private void analyzeImage(@NonNull ImageProxy imageProxy) {
        if (!scanning) {
            imageProxy.close();
            return;
        }

        try {
            InputImage inputImage = InputImage.fromMediaImage(
                    imageProxy.getImage(),
                    imageProxy.getImageInfo().getRotationDegrees()
            );

            barcodeScanner.process(inputImage)
                    .addOnSuccessListener(new OnSuccessListener<List<Barcode>>() {
                        @Override
                        public void onSuccess(List<Barcode> barcodes) {
                            if (barcodes == null || barcodes.isEmpty()) {
                                imageProxy.close();
                                return;
                            }

                            for (Barcode b : barcodes) {
                                String raw = b.getRawValue();
                                if (raw != null && !raw.isEmpty()) {
                                    deliverBarcode(raw);
                                }
                            }

                            imageProxy.close();
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            Log.e(TAG, "Barcode analyze failed", e);
                            imageProxy.close();
                        }
                    });
        } catch (Exception e) {
            Log.e(TAG, "analyzeImage error", e);
            imageProxy.close();
        }
    }

    private void deliverBarcode(String barcode) {
        Intent i = new Intent(MlkitBarcodeScannerPlugin.ACTION_BARCODE_DETECTED);
        i.putExtra(MlkitBarcodeScannerPlugin.EXTRA_BARCODE, barcode);
        i.putExtra(MlkitBarcodeScannerPlugin.EXTRA_SESSION_ID, sessionId);
        LocalBroadcastManager.getInstance(this).sendBroadcast(i);
    }

    // ---------------------------------------------------------------
    // Stop receiver: close this activity when plugin sends STOP_SCAN
    // ---------------------------------------------------------------
    private void registerStopReceiver() {
        stopReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String session = intent.getStringExtra(MlkitBarcodeScannerPlugin.EXTRA_SESSION_ID);
                // Only close if session matches (or if no session id was set)
                if (session == null || session.equals(sessionId)) {
                    Log.d(TAG, "Stop scan received, finishing activity");
                    finish();
                }
            }
        };

        IntentFilter filter = new IntentFilter(MlkitBarcodeScannerPlugin.ACTION_STOP_SCAN);
        LocalBroadcastManager.getInstance(this).registerReceiver(stopReceiver, filter);
    }

    private void unregisterStopReceiver() {
        if (stopReceiver != null) {
            try {
                LocalBroadcastManager.getInstance(this).unregisterReceiver(stopReceiver);
            } catch (IllegalArgumentException ignored) {}
            stopReceiver = null;
        }
    }

    @Override
    protected void onDestroy() {
        scanning = false;
        unregisterStopReceiver();
        try {
            if (cameraProvider != null) cameraProvider.unbindAll();
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQ) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startCamera();
            } else {
                Toast.makeText(this, "Camera permission denied", Toast.LENGTH_SHORT).show();
                finish();
            }
        }
    }
}