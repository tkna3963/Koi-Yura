package com.example.koi_yura;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * WebViewを一元管理するシングルトンクラス
 * アプリ全体で単一のWebViewインスタンスを保証する
 */
public class WebViewManager {
    private static final String TAG = "WebViewManager";
    private static final String PREFS_NAME = "WebViewManagerPrefs";
    private static final String KEY_WEBVIEW_ACTIVE = "isWebViewActive";

    private static WebViewManager instance;
    private WebView webView;
    private Context applicationContext;

    // プライベートコンストラクタ
    private WebViewManager(Context context) {
        this.applicationContext = context.getApplicationContext();
    }

    /**
     * WebViewManagerのインスタンスを取得
     */
    public static synchronized WebViewManager getInstance(Context context) {
        if (instance == null) {
            instance = new WebViewManager(context.getApplicationContext());
            Log.d(TAG, "WebViewManager インスタンスを作成しました");
        }
        return instance;
    }

    /**
     * WebViewを取得（なければ初期化）
     */
    public synchronized WebView getWebView(Context context, MainActivity.WebAppInterface webAppInterface) {
        if (webView == null) {
            Log.d(TAG, "新しいWebViewを作成します");

            // ActivityのUI更新は必ずUIスレッドで行う
            if (context instanceof MainActivity) {
                ((MainActivity) context).runOnUiThread(() -> {
                    createWebView(context, webAppInterface);
                });
            } else {
                createWebView(context, webAppInterface);
            }
        }
        return webView;
    }

    /**
     * WebViewを作成して初期化
     */
    private void createWebView(Context context, MainActivity.WebAppInterface webAppInterface) {
        try {
            if (context instanceof MainActivity) {
                webView = ((MainActivity) context).findViewById(R.id.mainwebview);

                if (webView == null) {
                    Log.e(TAG, "WebViewが見つかりません。レイアウトIDを確認してください");
                    return;
                }

                WebSettings webSettings = webView.getSettings();
                webSettings.setJavaScriptEnabled(true);
                webSettings.setCacheMode(WebSettings.LOAD_NO_CACHE);
                webSettings.setMediaPlaybackRequiresUserGesture(false);
                webSettings.setDomStorageEnabled(true);
                webSettings.setAllowFileAccess(true);
                webSettings.setAllowContentAccess(true);

                webView.setWebViewClient(new WebViewClient());
                webView.addJavascriptInterface(webAppInterface, "Android");
                webView.loadUrl("file:///android_res/raw/index.html");

                // 状態を保存
                setWebViewActive(true);
                Log.d(TAG, "WebViewを初期化しました");
            } else {
                Log.e(TAG, "WebViewの作成にはMainActivityのコンテキストが必要です");
            }
        } catch (Exception e) {
            Log.e(TAG, "WebViewの作成中にエラーが発生しました: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * WebViewをリロード
     */
    public synchronized void reloadWebView() {
        if (webView != null) {
            webView.reload();
            Log.d(TAG, "WebViewをリロードしました");
        }
    }

    /**
     * WebViewを一時停止（空のページを読み込み）
     */
    public synchronized void pauseWebView() {
        if (webView != null && isWebViewActive()) {
            webView.loadUrl("about:blank");
            Log.d(TAG, "WebViewを一時停止しました");
        }
    }

    /**
     * WebViewを完全に破棄
     */
    public synchronized void destroyWebView() {
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.clearCache(true);
            webView.clearHistory();
            webView.destroy();
            webView = null;
            setWebViewActive(false);
            Log.d(TAG, "WebViewを破棄しました");
        }
    }

    /**
     * WebViewの状態を保存
     */
    public void setWebViewActive(boolean isActive) {
        SharedPreferences prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putBoolean(KEY_WEBVIEW_ACTIVE, isActive);
        editor.apply();
        Log.d(TAG, "WebView状態を更新: " + isActive);
    }

    /**
     * WebViewがアクティブかどうかを取得
     */
    public boolean isWebViewActive() {
        SharedPreferences prefs = applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_WEBVIEW_ACTIVE, false);
    }

    /**
     * WebViewインスタンスが存在するかどうかを確認
     */
    public boolean hasWebViewInstance() {
        return webView != null;
    }

    /**
     * WebViewにメッセージを送信
     */
    public void executeJavaScript(String script) {
        if (webView != null) {
            webView.evaluateJavascript(script, null);
        }
    }
}