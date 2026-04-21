package com.novavault.app;

import android.app.Application;

public class MyApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        // Firebase se inicializa automáticamente a través de google-services.json
        // y los plugin de Capacitor
    }
}
