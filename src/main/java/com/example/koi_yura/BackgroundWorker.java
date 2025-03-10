package com.example.koi_yura;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleObserver;
import androidx.lifecycle.OnLifecycleEvent;
import androidx.lifecycle.ProcessLifecycleOwner;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.util.Locale;

public class BackgroundWorker extends Worker implements TextToSpeech.OnInitListener {
    private static final String TAG = "BackgroundWorker";
    private TextToSpeech textToSpeech;
    private static boolean isAppInForeground = true;
    private Context context;

    public BackgroundWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
        this.context = context;
        textToSpeech = new TextToSpeech(context, this);
        // アプリのライフサイクル監視を設定
        ProcessLifecycleOwner.get().getLifecycle().addObserver(new AppLifecycleObserver());
        Log.d(TAG, "BackgroundWorker コンストラクタが呼ばれました");
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "BackgroundWorker.doWork() - アプリはフォアグラウンド？: " + isAppInForeground);

        // アプリがフォアグラウンドにある場合は実行しない
        if (isAppInForeground) {
            return Result.success(); // 成功として返す（リトライせず終了）
        }

        // WebViewForegroundServiceが実行中かチェック
        if (!isServiceRunning()) {
            // サービスが実行中でなければ開始
            startForegroundService();
            Log.d(TAG, "WebViewForegroundServiceを開始しました");
        } else {
            Log.d(TAG, "WebViewForegroundServiceは既に実行中です");
        }

        // 状態の通知
        speakText("バックグラウンドワーカーが実行されました");

        return Result.success();
    }

    // サービスが実行中かチェック
    private boolean isServiceRunning() {
        SharedPreferences prefs = context.getSharedPreferences("service_prefs", Context.MODE_PRIVATE);
        boolean isServiceRunning = prefs.getBoolean("isServiceRunning", false);
        Log.d(TAG, "サービス実行状態: " + isServiceRunning);
        return isServiceRunning;
    }

    // フォアグラウンドサービスを開始
    private void startForegroundService() {
        Intent serviceIntent = new Intent(context, WebViewForegroundService.class);

        // Android 8.0以上ならstartForegroundService()を使用
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }

        // サービス実行フラグを設定
        SharedPreferences prefs = context.getSharedPreferences("service_prefs", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("isServiceRunning", true).apply();
    }

    // TTS で音声を再生
    private void speakText(String text) {
        if (textToSpeech != null && textToSpeech.getEngines().size() > 0) {
            Log.d(TAG, "音声発話: " + text);
            textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
        } else {
            Log.e(TAG, "TTSが初期化されていないか、利用可能なエンジンがありません");
        }
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            int result = textToSpeech.setLanguage(Locale.JAPAN);
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                Log.e(TAG, "日本語のTTSデータが利用できません");
            }
            Log.d(TAG, "TTS初期化成功");
        } else {
            Log.e(TAG, "TTS初期化失敗: ステータス=" + status);
        }
    }

    @Override
    public void onStopped() {
        super.onStopped();
        Log.d(TAG, "BackgroundWorker.onStopped()");

        // リソースの解放
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
    }

    // アプリのライフサイクルを監視
    static class AppLifecycleObserver implements LifecycleObserver {
        @OnLifecycleEvent(Lifecycle.Event.ON_START)
        public void onMoveToForeground() {
            isAppInForeground = true;
            Log.d(TAG, "アプリがフォアグラウンドに移行しました");
        }

        @OnLifecycleEvent(Lifecycle.Event.ON_STOP)
        public void onMoveToBackground() {
            isAppInForeground = false;
            Log.d(TAG, "アプリがバックグラウンドに移行しました");
        }
    }
}