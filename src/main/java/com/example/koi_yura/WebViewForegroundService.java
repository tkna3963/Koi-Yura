package com.example.koi_yura;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.RequiresApi;

public class WebViewForegroundService extends Service {

    private WebView webView;
    private static final String CHANNEL_ID = "WebViewForegroundServiceChannel";

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public void onCreate() {
        super.onCreate();

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
        webView = new WebView(this);
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_res/raw/index.html"); // 例としてウェブサイトを読み込む


        // 通知を作成してサービスをフォアグラウンドにする
        Notification notification = new Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("WebView Service Running")
                .setContentText("This service is running in the foreground.")
                .build();

        startForeground(1, notification);
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
    }
}
