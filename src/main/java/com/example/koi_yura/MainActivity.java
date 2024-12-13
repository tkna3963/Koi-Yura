package com.example.koi_yura;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.util.Locale;

public class MainActivity extends AppCompatActivity implements TextToSpeech.OnInitListener, LocationListener {
    private WebView webView;
    private TextToSpeech textToSpeech;
    private LocationManager locationManager;
    private double latitude = 0.0;
    private double longitude = 0.0;

    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // フォアグラウンドサービスを開始
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(new Intent(this, WebViewForegroundService.class));
        }

        // WebView の初期化
        initializeWebView();

        // TTS の初期化
        textToSpeech = new TextToSpeech(this, this);

        // LocationManager の初期化と権限チェック
        initializeLocationManager();
    }

    // WebView の初期化メソッド
    private void initializeWebView() {
        webView = findViewById(R.id.mainwebview);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient());

        // JavaScript インターフェースを追加
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");

        // ローカル HTML ファイルを読み込む
        webView.loadUrl("file:///android_res/raw/index.html");
    }

    // LocationManager の初期化と権限チェック
    private void initializeLocationManager() {
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (!hasLocationPermission()) {
            requestLocationPermission();
        } else {
            startLocationUpdates();
        }
    }

    // 権限が付与されているか確認
    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    // 権限をリクエスト
    private void requestLocationPermission() {
        ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, LOCATION_PERMISSION_REQUEST_CODE);
    }

    // 位置情報の更新を開始
    private void startLocationUpdates() {
        if (hasLocationPermission()) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 10, this);
        }
    }

    // TextToSpeech の初期化完了時のコールバック
    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            int langResult = textToSpeech.setLanguage(Locale.JAPAN);
            if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                Toast.makeText(this, "日本語のTTSデータが利用できません", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(this, "TTS の初期化に失敗しました", Toast.LENGTH_SHORT).show();
        }
    }

    // 位置情報が更新された時の処理
    @Override
    public void onLocationChanged(Location location) {
        latitude = location.getLatitude();
        longitude = location.getLongitude();
    }

    // ユーザーの権限リクエストに対する応答
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

    // JavaScript インターフェース
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
    }

    // リソース解放処理
    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        if (webView != null) {
            webView.clearCache(true);
            webView.clearHistory();
        }
        super.onDestroy();
    }
}
