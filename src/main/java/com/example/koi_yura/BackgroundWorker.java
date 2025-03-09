package com.example.koi_yura;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.speech.tts.TextToSpeech;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.Locale;

public class BackgroundWorker extends Worker implements TextToSpeech.OnInitListener, LocationListener {
    private TextToSpeech textToSpeech;
    private LocationManager locationManager;
    private double latitude = 0.0, longitude = 0.0;

    public BackgroundWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
        textToSpeech = new TextToSpeech(context, this);
        initializeLocationManager(context);
    }

    @SuppressLint("NewApi")
    @NonNull
    @Override
    public Result doWork() {
        // WebViewForegroundServiceを起動
        Intent serviceIntent = new Intent(getApplicationContext(), WebViewForegroundService.class);
        getApplicationContext().startService(serviceIntent); // startForegroundはService内で呼び出されます

        speakText("バックグラウンド実行中");
        return Result.success();
    }

    private void initializeLocationManager(Context context) {
        locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
        if (context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 10, this);
        }
    }

    private void speakText(String text) {
        if (textToSpeech != null) {
            textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            textToSpeech.setLanguage(Locale.JAPAN);
        }
    }

    @Override
    public void onLocationChanged(@NonNull Location location) {
        latitude = location.getLatitude();
        longitude = location.getLongitude();
    }

    @Override
    public void onStopped() {
        super.onStopped();
        if (textToSpeech != null) {
            textToSpeech.shutdown();
        }
    }
}
