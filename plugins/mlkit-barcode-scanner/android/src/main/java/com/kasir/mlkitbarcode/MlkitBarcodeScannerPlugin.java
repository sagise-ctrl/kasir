package com.kasir.mlkitbarcode;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.util.Log;

import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "MlkitBarcodeScanner",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { Manifest.permission.CAMERA }
        )
    }
)
public class MlkitBarcodeScannerPlugin extends Plugin {

    private static final String TAG = "MlkitBarcodeScanner";

    // Broadcast action & extras shared with CameraActivity
    public static final String ACTION_BARCODE_DETECTED = "com.kasir.mlkitbarcode.BARCODE_DETECTED";
    public static final String ACTION_STOP_SCAN       = "com.kasir.mlkitbarcode.STOP_SCAN";
    public static final String EXTRA_BARCODE           = "barcode";
    public static final String EXTRA_SESSION_ID        = "session_id";

    /** Unique session id per startScan call so we can match broadcasts. */
    private String currentSessionId = null;

    /** Broadcast receiver that forwards barcode results to the JS listener. */
    private BroadcastReceiver barcodeReceiver;

    /** Saved call for requestCameraPermission. */
    private PluginCall permissionCall = null;

    @Override
    public void load() {
        super.load();
        Log.i(TAG, "MlkitBarcodeScannerPlugin loaded");
    }

    // ---------------------------------------------------------------
    // requestCameraPermission  (Capacitor v8 pattern)
    // ---------------------------------------------------------------
    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        // Check if already granted via the @CapacitorPlugin permission alias
        if (getPermissionState("camera") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return;
        }

        permissionCall = call;
        requestPermissionForAlias("camera", call, "cameraPermissionCallback");
    }

    @PermissionCallback
    public void cameraPermissionCallback(PluginCall call) {
        // This is called after the user responds to the permission dialog
        boolean granted = (getPermissionState("camera") == com.getcapacitor.PermissionState.GRANTED);
        JSObject res = new JSObject();
        res.put("granted", granted);
        call.resolve(res);
        permissionCall = null;
    }

    // ---------------------------------------------------------------
    // startScan
    // ---------------------------------------------------------------
    @PluginMethod
    public void startScan(PluginCall call) {
        try {
            // Verify camera permission first
            if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
                call.reject("Camera permission not granted. Call requestCameraPermission() first.");
                return;
            }

            // Generate a unique session id for this scan invocation
            currentSessionId = java.util.UUID.randomUUID().toString();

            // Register broadcast receiver to receive barcode results from CameraActivity
            registerBarcodeReceiver();

            Intent intent = new Intent(getActivity(), CameraActivity.class);
            intent.putExtra(CameraActivity.EXTRA_SCANNER_SESSION_ID, currentSessionId);
            getActivity().startActivity(intent);

            Log.i(TAG, "CameraActivity launched, session=" + currentSessionId);

            // Resolve immediately so the JS promise completes
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "startScan failed", e);
            call.reject(e.getMessage(), e);
        }
    }

    // ---------------------------------------------------------------
    // stopScan
    // ---------------------------------------------------------------
    @PluginMethod
    public void stopScan(PluginCall call) {
        try {
            // Tell CameraActivity to finish via broadcast
            Intent stopIntent = new Intent(ACTION_STOP_SCAN);
            stopIntent.putExtra(EXTRA_SESSION_ID, currentSessionId);
            LocalBroadcastManager.getInstance(getActivity()).sendBroadcast(stopIntent);

            unregisterBarcodeReceiver();
            currentSessionId = null;

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "stopScan failed", e);
            call.reject(e.getMessage(), e);
        }
    }

    // ---------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------

    private void registerBarcodeReceiver() {
        unregisterBarcodeReceiver(); // ensure no duplicate

        barcodeReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (ACTION_BARCODE_DETECTED.equals(action)) {
                    String barcode = intent.getStringExtra(EXTRA_BARCODE);
                    String session = intent.getStringExtra(EXTRA_SESSION_ID);

                    // Only process if session matches our current scan
                    if (barcode != null && !barcode.isEmpty()
                            && (currentSessionId == null || currentSessionId.equals(session))) {
                        Log.d(TAG, "Barcode received: " + barcode + " session=" + session);
                        JSObject payload = new JSObject();
                        payload.put("barcode", barcode);
                        notifyListeners("barcodeDetected", payload);
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(ACTION_BARCODE_DETECTED);
        LocalBroadcastManager.getInstance(getActivity())
                .registerReceiver(barcodeReceiver, filter);

        Log.i(TAG, "Barcode receiver registered");
    }

    private void unregisterBarcodeReceiver() {
        if (barcodeReceiver != null) {
            try {
                LocalBroadcastManager.getInstance(getActivity())
                        .unregisterReceiver(barcodeReceiver);
            } catch (IllegalArgumentException ignored) {}
            barcodeReceiver = null;
            Log.i(TAG, "Barcode receiver unregistered");
        }
    }

    @Override
    protected void handleOnDestroy() {
        unregisterBarcodeReceiver();
        super.handleOnDestroy();
    }
}