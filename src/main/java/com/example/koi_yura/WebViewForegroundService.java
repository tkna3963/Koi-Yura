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

        // WebViewの設定
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true); // JavaScriptの有効化
        webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE); // キャッシュ無効
        webSettings.setMediaPlaybackRequiresUserGesture(false); // メディア再生のユーザー操作なし
        webSettings.setDomStorageEnabled(true); // DOMストレージ有効化
        webSettings.setAllowFileAccess(true); // ファイルアクセス許可
        webSettings.setAllowContentAccess(true); // コンテンツアクセス許可

        // WebViewClientを設定してリンクの遷移をWebView内で処理
        webView.setWebViewClient(new WebViewClient());
        // Webページの読み込み
        webView.loadUrl("file:///android_res/raw/index.html");

        // 現在時刻を取得してフォーマット
        String currentTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());

        // 通知を作成してサービスをフォアグラウンドにする
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("WebView Service Running")
                .setContentText(currentTime)
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
