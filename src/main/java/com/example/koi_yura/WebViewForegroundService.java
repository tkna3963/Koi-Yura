//WebViewForegroundService.java
package com.example.koi_yura;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.annotation.RequiresPermission;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class WebViewForegroundService extends Service {

    private WebView webView;
    private static final String CHANNEL_ID = "WebViewForegroundServiceChannel";

    private static final String myCHANNEL_ID = "koi_yura_notifications";
    private static boolean isWebViewActive = false; // WebViewの状態を管理する静的フラグ

    private TextToSpeech textToSpeech;

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
        webView.setWebContentsDebuggingEnabled(true);
        // WebViewClientを設定してリンクの遷移をWebView内で処理
        webView.setWebViewClient(new WebViewClient());
        // Webページの読み込み
        webView.loadUrl("file:///android_res/raw/index.html");

        // 現在時刻を取得してフォーマット
        String currentTime = new SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(new Date());

        // 通知をクリックしたときにアプリを終了するPendingIntentを作成
        Intent closeIntent = new Intent(this, BackgroundWorker.class);
        closeIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, closeIntent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // 通知を作成してサービスをフォアグラウンドにする
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("バックグラウンド実行を開始したよ!!")
                .setContentText(currentTime + " に開始したよ")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentIntent(pendingIntent) // 通知タップ時の動作を設定
                .setAutoCancel(true) // 通知タップ後に消えるように
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

    public class WebAppInterface {
        private final Context mContext;

        WebAppInterface(Context context) {
            this.mContext = context;
            createNotificationChannel();
        }

        @JavascriptInterface
        public void speakText(String text) {
            if (textToSpeech != null) {
                textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
            }
        }

        @RequiresPermission(Manifest.permission.POST_NOTIFICATIONS)
        @JavascriptInterface
        public void showNotification(String title, String message) {
            NotificationCompat.Builder builder = new NotificationCompat.Builder(mContext, myCHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_android_black_24dp)
                    .setContentTitle(title)
                    .setContentText(message)
                    .setPriority(NotificationCompat.PRIORITY_HIGH)
                    .setAutoCancel(true);

            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(mContext);
            notificationManager.notify();
        }

        private void createNotificationChannel() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                CharSequence name = "Koi Yura 通知";
                String description = "WebView からの通知を管理します";
                int importance = NotificationManager.IMPORTANCE_HIGH;
                NotificationChannel channel = new NotificationChannel(myCHANNEL_ID, name, importance);
                channel.setDescription(description);

                NotificationManager notificationManager = mContext.getSystemService(NotificationManager.class);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                }
            }
        }
    }
}
