package com.example.koi_yura;

import android.Manifest;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.WorkManager;

import java.util.List;
import java.util.Locale;

public class MainActivity extends AppCompatActivity implements TextToSpeech.OnInitListener, LocationListener {

    private static final String TAG = "MainActivity";
    private TextToSpeech textToSpeech;
    private LocationManager locationManager;
    private double latitude = 0.0;
    private double longitude = 0.0;
    private WebViewManager webViewManager;
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Log.d(TAG, "MainActivity.onCreate()");

        // WebViewManagerの初期化
        webViewManager = WebViewManager.getInstance(this);

        // TTSの初期化
        textToSpeech = new TextToSpeech(this, this);

        // 位置情報の設定
        initializeLocationManager();

        // サービスの確認と制御 (既にサービスが実行中ならActivityではWebViewを初期化しない)
        if (!isServiceRunning(WebViewForegroundService.class)) {
            // WebViewの初期化
            webViewManager.getWebView(this, new WebAppInterface(this));
        } else {
            Log.d(TAG, "フォアグラウンドサービスが実行中のため、ActivityでのWebView初期化をスキップします");
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        Log.d(TAG, "MainActivity.onStart()");

        // WorkManagerのキャンセル
        WorkManager.getInstance(this).cancelAllWorkByTag("BackgroundWorker");
        Log.d(TAG, "バックグラウンドワーカーをキャンセルしました");
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "MainActivity.onResume()");

        // フォアグラウンドサービスが実行中なら停止（Activityが前面に出てきたため）
        if (isServiceRunning(WebViewForegroundService.class)) {
            stopService(new Intent(this, WebViewForegroundService.class));
            Log.d(TAG, "フォアグラウンドサービスを停止しました");
        }

        // WebViewが未初期化なら初期化する
        if (!webViewManager.hasWebViewInstance()) {
            webViewManager.getWebView(this, new WebAppInterface(this));
            Log.d(TAG, "WebViewを初期化しました");
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.d(TAG, "MainActivity.onPause()");
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.d(TAG, "MainActivity.onStop()");

        // アプリがバックグラウンドに移行した場合のみサービスを開始
        if (!isAppInForeground()) {
            // サービスが実行中でない場合のみ開始
            if (!isServiceRunning(WebViewForegroundService.class)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    startForegroundService(new Intent(this, WebViewForegroundService.class));
                } else {
                    startService(new Intent(this, WebViewForegroundService.class));
                }
                Log.d(TAG, "フォアグラウンドサービスを開始しました");
            }

            // WebViewはServiceで管理するためActivityでは解放する
            webViewManager.pauseWebView();
        }
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= TRIM_MEMORY_RUNNING_CRITICAL) {
            webViewManager.reloadWebView();
            Log.d(TAG, "メモリ不足のためWebViewをリロードしました");
        }
    }

    @Override
    protected void onDestroy() {
        Log.d(TAG, "MainActivity.onDestroy()");

        // Activityが完全に破棄された場合、かつバックグラウンドサービスが実行されていない場合のみWebViewを破棄
        if (!isServiceRunning(WebViewForegroundService.class)) {
            webViewManager.destroyWebView();
        }

        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }

        super.onDestroy();
    }

    // 位置情報の設定
    private void initializeLocationManager() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (hasLocationPermission()) {
            startLocationUpdates();
        } else {
            requestLocationPermission();
        }
    }

    // 位置情報の権限チェック
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    // 位置情報の権限リクエスト
    private void requestLocationPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST_CODE);
    }

    // 位置情報の更新開始
    private void startLocationUpdates() {
        if (hasLocationPermission()) {
            try {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 10, this);
            } catch (SecurityException e) {
                Toast.makeText(this, "位置情報のリクエストに失敗しました: 権限エラー", Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location != null) {
            latitude = location.getLatitude();
            longitude = location.getLongitude();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startLocationUpdates();
            } else {
                Toast.makeText(this, "位置情報の権限が拒否されました", Toast.LENGTH_SHORT).show();
            }
        }
    }

    // TTSの初期化
    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            int langResult = textToSpeech.setLanguage(Locale.JAPAN);
            if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                Toast.makeText(this, "日本語のTTSデータが利用できません", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(this, "TTS の初期化に失敗しました", Toast.LENGTH_SHORT).show();
            Log.e(TAG, "TextToSpeechの初期化に失敗しました。ステータス: " + status);
        }
    }

    // サービスが実行中かチェックするメソッド
    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    // アプリがフォアグラウンドにいるか確認
    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager != null) {
            List<ActivityManager.RunningAppProcessInfo> appProcesses = activityManager.getRunningAppProcesses();
            if (appProcesses != null) {
                for (ActivityManager.RunningAppProcessInfo appProcess : appProcesses) {
                    if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                        return appProcess.processName.equals(getPackageName());
                    }
                }
            }
        }
        return false;
    }

    // WebViewとのインタラクション
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context context) {
            mContext = context;
        }

        @JavascriptInterface
        public void speakText(String text) {
            if (textToSpeech != null) {
                textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
            }
        }

        @JavascriptInterface
        public String getLocation() {
            if (latitude != 0.0 && longitude != 0.0) {
                return "Latitude: " + latitude + ", Longitude: " + longitude;
            } else {
                return "位置情報が取得できません";
            }
        }

        @JavascriptInterface
        public void reloadWebView() {
            runOnUiThread(() -> {
                webViewManager.reloadWebView();
                Toast.makeText(mContext, "WebView をリロードしました", Toast.LENGTH_SHORT).show();
            });
        }
    }
}