package com.example.koi_yura;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.AsyncTask;
import android.os.Build;
import android.widget.RemoteViews;

import androidx.annotation.RequiresApi;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.AsyncTask;
import android.os.Build;
import androidx.annotation.RequiresApi;
public class AppWidget extends AppWidgetProvider {

    private static final int UPDATE_INTERVAL = 10000; // 60秒ごとに変更
    private static final String API_URL = "https://api.p2pquake.net/v2/history?limit=100"; // 最新1件取得

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
        scheduleNextUpdate(context);
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        // 非同期で地震データを取得
        new FetchEarthquakeDataTask(context, appWidgetManager, appWidgetId, views).execute();

        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_image, pendingIntent);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(intent.getAction()) || "UPDATE_WIDGET".equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, AppWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }

    private void scheduleNextUpdate(Context context) {
        Intent intent = new Intent(context, AppWidget.class);
        intent.setAction("UPDATE_WIDGET");
        PendingIntent pendingIntent = PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        long triggerAtMillis = System.currentTimeMillis() + UPDATE_INTERVAL;
        alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent);
    }

    // 地震データを取得するAsyncTask
    private static class FetchEarthquakeDataTask extends AsyncTask<Void, Void, String> {
        private Context context;
        private AppWidgetManager appWidgetManager;
        private int appWidgetId;
        private RemoteViews views;

        FetchEarthquakeDataTask(Context context, AppWidgetManager appWidgetManager, int appWidgetId, RemoteViews views) {
            this.context = context;
            this.appWidgetManager = appWidgetManager;
            this.appWidgetId = appWidgetId;
            this.views = views;
        }

        @RequiresApi(api = Build.VERSION_CODES.O)
        @Override
        protected String doInBackground(Void... voids) {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo networkInfo = cm.getActiveNetworkInfo();

            if (networkInfo == null || !networkInfo.isConnected() || networkInfo.getType() != ConnectivityManager.TYPE_WIFI) {
                return "Wi-Fiに接続されていません";
            }
            try {
                URL url = new URL(API_URL);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("GET");
                BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
                StringBuilder builder = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    builder.append(line);
                }
                reader.close();
                connection.disconnect();

                // JSON解析
                JSONArray array = new JSONArray(builder.toString());
                if (array.length() > 0) {
                    JSONObject latest = array.getJSONObject(0);

                    LocalDateTime now = LocalDateTime.now();
                    // 時刻をフォーマット（例：2025-04-19 12:34:56）
                    DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm/");
                    String formattedTime = now.format(formatter);
                    return formattedTime+latest.getString("code")+"情報";
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
            return "地震情報取得失敗";
        }

        @Override
        protected void onPostExecute(String result) {
            views.setTextViewText(R.id.KoisiWidgetText, result);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
