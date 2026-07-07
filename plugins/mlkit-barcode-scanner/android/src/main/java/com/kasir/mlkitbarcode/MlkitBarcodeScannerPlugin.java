package com.kasir.mlkitbarcode;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginHandle;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.getcapacitor.PermissionState;
import com.getcapacitor.util.CapacitorPermission;

@CapacitorPlugin(name = "MlkitBarcodeScanner")
public class MlkitBarcodeScannerPlugin extends Plugin {

    private static final String TAG = "MlkitBarcodeScanner";
    private static final int CAMERA_PERMISSION_REQ_ID = 73421;

    @Override
    public void load() {
        super.load();
        Log.i(TAG, "MlkitBarcodeScannerPlugin load()");
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        try {
            Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity is null");
                return;
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (activity.checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
                    JSObject res = new JSObject();
                    res.put("granted", true);
                    call.resolve(res);
                    return;
                }

                if (getPermissionState(Manifest.permission.CAMERA) == PermissionState.GRANTED) {
                    JSObject res = new JSObject();
                    res.put("granted", true);
                    call.resolve(res);
                    return;
                }
            }

            // Ask permission
            boolean asked = askForPermission(call, Manifest.permission.CAMERA);
            if (!asked) {
                JSObject res = new JSObject();
                res.put("granted", false);
                call.resolve(res);
            }
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    private boolean askForPermission(PluginCall call, String permission) {
        try {
            if (getActivity() == null) return false;
            // Capacitor handles permission result via PermissionState in bridge; but to keep this plugin self-contained,
            // we’ll use Cap permission helper.
            PluginHandle pluginHandle = getPluginHandle();
            if (pluginHandle == null) return false;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{permission},
                        CAMERA_PERMISSION_REQ_ID
                );
                return true;
            }
            // Pre-M always granted
            JSObject res = new JSObject();
            res.put("granted", true);
            call.resolve(res);
            return false;
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
            return false;
        }
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        // NOTE: This is a scaffolding implementation to be completed with CameraX+ML Kit.
        // For now, reject to avoid misleading “success” without native scanning.
        call.reject("Native ML Kit scanning not implemented yet. Please finish native camera+MLKit pipeline.");
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        // NOTE: scaffolding
        call.resolve();
    }
}
