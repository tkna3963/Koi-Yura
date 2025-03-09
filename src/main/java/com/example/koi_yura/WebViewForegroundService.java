package com.example.koi_yura;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.RequiresApi;
import androidx.core.app.NotificationCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class WebViewForegroundService extends Service {

    private WebView webView;
    private static final String CHANNEL_ID = "WebViewForegroundServiceChannel";
    private static boolean isWebViewActive = false; // WebViewの状態を管理する静的フラグ

    // WebAppInterfaceクラスを内部クラスとして定義
    public static class WebAppInterface {
        private Service mContext;

        WebAppInterface(Service c) {
            mContext = c;
        }

        @JavascriptInterface
        public void showToast(String toast) {
            // JavaScriptから呼び出せるメソッドをここに追加
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public void onCreate() {
        super.onCreate();

        if (isWebViewActive) {
            // すでにWebViewが起動している場合は処理しない
            return;
        }

        // WebViewの初期化
        webView = new WebView(this);

        // Notification Channelの作成 (Android 8.0以上用)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "WebView Service Channel",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }

        // WebViewの設定
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);

        webView.setWebViewClient(new WebViewClient());
        webView.addJavascriptInterface(new WebAppInterface(this), "Android");
        webView.loadUrl("file:///android_res/raw/index.html");

        // 現在時刻を取得してフォーマット
        String currentTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());

        // 通知を作成してサービスをフォアグラウンドにする
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("WebView Service Running")
                .setContentText("起動時刻: " + currentTime)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .build();

        startForeground(1, notification);

        // WebViewが起動したことを記録
        isWebViewActive = true;
    }

    @Override
    public IBinder onBind(Intent intent) {
        // バインドされるサービスではないので、nullを返す
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        // WebViewのクリーンアップ
        if (webView != null) {
            webView.destroy();
        }
        // サービス終了時にWebViewを非アクティブにする
        isWebViewActive = false;
    }
}
