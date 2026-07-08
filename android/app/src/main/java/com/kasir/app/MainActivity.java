package com.kasir.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.kasir.mlkitbarcode.MlkitBarcodeScannerPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the ML Kit Barcode Scanner plugin explicitly
        registerPlugin(MlkitBarcodeScannerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}