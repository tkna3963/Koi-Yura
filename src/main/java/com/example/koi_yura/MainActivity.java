package com.example.koi_yura;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.TextToSpeech.OnInitListener;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import java.util.Locale;

public class MainActivity extends AppCompatActivity implements OnInitListener, LocationListener {

    private WebView webView;
    private TextToSpeech textToSpeech;
    private SensorManager sensorManager;
    private LocationManager locationManager;
    private double latitude = 0.0, longitude = 0.0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // WebView の初期化
        webView = findViewById(R.id.mainwebview);

        // TTSの初期化
        textToSpeech = new TextToSpeech(this, this);


        // LocationManagerの初期化
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION}, 1);
        } else {
            startLocationUpdates();
        }

        // WebView の設定
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        // JavaScriptインターフェースを追加
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");

        // WebViewClient を設定
        webView.setWebViewClient(new WebViewClient() {});

        // WebViewで表示するURLを読み込む
        webView.loadUrl("file:///android_res/raw/index.html");
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            // 言語設定（日本語）
            int langResult = textToSpeech.setLanguage(Locale.JAPAN);
            if (langResult == TextToSpeech.LANG_MISSING_DATA ||
                    langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                Toast.makeText(this, "日本語のTTSデータがありません", Toast.LENGTH_SHORT).show();
            }
        } else {
            Toast.makeText(this, "TTSの初期化に失敗しました", Toast.LENGTH_SHORT).show();
        }
    }
    
    private void startLocationUpdates() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 10, this);
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        latitude = location.getLatitude();
        longitude = location.getLongitude();
    }


    // JavaScriptから呼び出されるインターフェース
    public class WebAppInterface {
        Context mContext;

        WebAppInterface(Context c) {
            mContext = c;
        }

        @JavascriptInterface
        public void speakText(String text) {
            if (textToSpeech != null) {
                textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
            }
        }

        @JavascriptInterface
        public String getLocation() {
            // 緯度と経度が利用可能な場合に返す
            if (latitude != 0.0 && longitude != 0.0) {
                return "Latitude: " + latitude + ", Longitude: " + longitude;
            } else {
                return "位置情報が取得できません";
            }
        }
    }

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
    }
}
