package com.example.koi_yura;

import android.Manifest;
import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import android.webkit.JavascriptInterface;

public class MainActivity extends AppCompatActivity implements TextToSpeech.OnInitListener, LocationListener {
    private WebView webView;
    private TextToSpeech textToSpeech;
    private LocationManager locationManager;
    private double latitude = 0.0;
    private double longitude = 0.0;

    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1;
    private boolean isWorkScheduled = false;
    private boolean isWebViewActive = false; // WebViewの状態を管理する変数

    // フォアグラウンドで動作しているかをチェック
    private boolean isAppInForeground() {
        ActivityManager activityManager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager != null) {
            for (ActivityManager.RunningAppProcessInfo appProcess : activityManager.getRunningAppProcesses()) {
                if (appProcess.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                    return appProcess.processName.equals(getPackageName());
                }
            }
        }
        return false;
    }

    // サービスが実行中かどうかを確認
    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // WebViewがすでにアクティブかどうかをSharedPreferencesで確認
        SharedPreferences preferences = getSharedPreferences("WebViewState", MODE_PRIVATE);
        isWebViewActive = preferences.getBoolean("isWebViewActive", false);

        // フォアグラウンドサービスの開始
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(new Intent(this, WebViewForegroundService.class));
        }

        textToSpeech = new TextToSpeech(this, this);
        initializeLocationManager();

        // WebViewがアクティブでない場合に初期化
        if (!isWebViewActive) {
            initializeWebView();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();

        // アプリがフォアグラウンドに来たとき
        if (isAppInForeground()) {
            // WebViewがまだアクティブでないなら、WebViewを開く
            if (!isWebViewActive) {
                // WebViewの状態をアクティブに設定
                isWebViewActive = true;
                SharedPreferences preferences = getSharedPreferences("WebViewState", MODE_PRIVATE);
                SharedPreferences.Editor editor = preferences.edit();
                editor.putBoolean("isWebViewActive", true);
                editor.apply();

                initializeWebView(); // WebViewの再初期化
            }

            // バックグラウンドワーカーのスケジュール（アプリがフォアグラウンドに戻った場合）
            if (!isWorkScheduled) {
                scheduleBackgroundWorker();
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();

        // アプリがバックグラウンドに行ったとき
        if (isAppInForeground()) {
            cancelBackgroundWorker(); // バックグラウンドに行くときに作業をキャンセル
        }

        // WebViewを一時的に無効化
        if (isWebViewActive) {
            isWebViewActive = false;
            SharedPreferences preferences = getSharedPreferences("WebViewState", MODE_PRIVATE);
            SharedPreferences.Editor editor = preferences.edit();
            editor.putBoolean("isWebViewActive", false);
            editor.apply();

            // WebViewをリセット
            if (webView != null) {
                webView.loadUrl("about:blank");
                webView.clearCache(true);
                webView.clearHistory();
                webView.destroy(); // WebViewを完全に解放
                webView = null;
            }
        }
    }

    private void scheduleBackgroundWorker() {
        // PeriodicWorkRequestで定期的にバックグラウンドワーカーを実行
        PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                BackgroundWorker.class, 15, TimeUnit.MINUTES // 15分ごとに実行
        )
                .addTag("BackgroundWorker")  // タグを付けて識別
                .build();

        // WorkManagerでタスクをスケジュール
        WorkManager.getInstance(this).enqueue(workRequest);
        isWorkScheduled = true; // 作業がスケジュールされたことを記録
    }

    private void cancelBackgroundWorker() {
        // WorkManagerで登録されているバックグラウンドワークをキャンセル
        WorkManager.getInstance(this).cancelAllWorkByTag("BackgroundWorker");
        isWorkScheduled = false; // 作業がキャンセルされたことを記録
    }

    private void initializeWebView() {
        // WebViewがまだ開かれていない場合のみ初期化
        if (!isWebViewActive) {
            webView = findViewById(R.id.mainwebview);

            WebSettings webSettings = webView.getSettings();
            webSettings.setJavaScriptEnabled(true);
            webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
            webSettings.setMediaPlaybackRequiresUserGesture(false);
            webSettings.setDomStorageEnabled(true);
            webSettings.setAllowFileAccess(true);
            webSettings.setAllowContentAccess(true);

            webView.setWebViewClient(new WebViewClient());
            webView.addJavascriptInterface(new WebAppInterface(this, webView), "Android");
            webView.loadUrl("file:///android_res/raw/index.html");

            // WebViewの状態をアクティブに設定
            isWebViewActive = true;
            SharedPreferences preferences = getSharedPreferences("WebViewState", MODE_PRIVATE);
            SharedPreferences.Editor editor = preferences.edit();
            editor.putBoolean("isWebViewActive", true);
            editor.apply();
        }
    }

    private void initializeLocationManager() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (hasLocationPermission()) {
            startLocationUpdates();
        } else {
            // すでに位置情報の権限がない場合のみ、リクエストを呼び出す
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, Manifest.permission.ACCESS_FINE_LOCATION)) {
                // ユーザーに権限リクエストの理由を説明する処理（必要に応じて追加）
            } else {
                requestLocationPermission();
            }
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void requestLocationPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST_CODE);
    }

    private void startLocationUpdates() {
        if (hasLocationPermission()) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 10, this);
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            int langResult = textToSpeech.setLanguage(Locale.JAPAN);
            if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                Toast.makeText(this, "日本語のTTSデータが利用できません", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(this, "TTS の初期化に失敗しました", Toast.LENGTH_SHORT).show();
            // 詳細なログを追加
            Log.e("TTS", "TextToSpeechの初期化に失敗しました。ステータス: " + status);
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

    // WebAppInterface クラス
    public class WebAppInterface {
        Context mContext;
        WebView webView;

        WebAppInterface(Context context, WebView webView) {
            mContext = context;
            this.webView = webView;
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
                if (webView != null) {
                    webView.reload();
                    Toast.makeText(mContext, "WebView をリロードしました", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level >= TRIM_MEMORY_RUNNING_CRITICAL) {
            runOnUiThread(() -> {
                if (webView != null) {
                    webView.reload();
                    Toast.makeText(this, "メモリ不足のためリロードしました", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        // WebViewを完全に解放
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
    }
}
