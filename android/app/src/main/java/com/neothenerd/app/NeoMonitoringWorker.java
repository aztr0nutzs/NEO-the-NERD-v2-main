package com.neothenerd.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

public class NeoMonitoringWorker extends Worker {
  static final String PREFS = "neo_monitoring_prefs";
  static final String KEY_LAST_RESULT = "last_result";
  static final String KEY_NOTIFY = "notify_enabled";
  static final String CHANNEL_ID = "neo_network_monitoring";

  public NeoMonitoringWorker(@NonNull Context context, @NonNull WorkerParameters params) {
    super(context, params);
  }

  @NonNull
  @Override
  public Result doWork() {
    Context context = getApplicationContext();
    long now = System.currentTimeMillis();
    boolean online = isNetworkReachable(context);

    try {
      JSONObject current = new JSONObject();
      current.put("timestamp", now);
      current.put("online", online);
      current.put("worker", "android-workmanager");

      String previousRaw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_LAST_RESULT, null);
      JSONObject previous = previousRaw == null ? null : new JSONObject(previousRaw);
      boolean changed = previous != null && previous.optBoolean("online", online) != online;

      current.put("changed", changed);
      if (changed) {
        JSONArray deltas = new JSONArray();
        deltas.put(online ? "network_restored" : "network_lost");
        current.put("deltas", deltas);
      }

      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_LAST_RESULT, current.toString())
        .apply();

      boolean notify = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_NOTIFY, true);
      if (notify && changed) {
        postNotification(context, online ? "Network restored" : "Network offline", "Background monitor detected connectivity change.");
      }
      return Result.success();
    } catch (Exception ex) {
      return Result.retry();
    }
  }

  private static boolean isNetworkReachable(Context context) {
    ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
    if (cm == null) return false;
    Network network = cm.getActiveNetwork();
    if (network == null) return false;
    NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
    if (capabilities == null) return false;
    return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
  }

  private static void postNotification(Context context, String title, String body) {
    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (manager == null) return;

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "NEO Monitoring", NotificationManager.IMPORTANCE_DEFAULT);
      manager.createNotificationChannel(channel);
    }

    NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_notify_sync)
      .setContentTitle(title)
      .setContentText(body)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .setAutoCancel(true);

    manager.notify((int) (System.currentTimeMillis() % Integer.MAX_VALUE), builder.build());
  }
}
