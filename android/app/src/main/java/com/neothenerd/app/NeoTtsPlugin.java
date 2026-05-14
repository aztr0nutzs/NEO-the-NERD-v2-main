package com.neothenerd.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

@CapacitorPlugin(name = "NeoTts")
public class NeoTtsPlugin extends Plugin {
  private static final String TAG = "NeoTtsPlugin";
  private TextToSpeech tts;
  private volatile boolean ready = false;
  private volatile boolean failed = false;

  @Override
  public void load() {
    super.load();
    tts = new TextToSpeech(getContext(), status -> {
      ready = status == TextToSpeech.SUCCESS;
      failed = !ready;
      if (ready && tts != null) {
        int languageStatus = tts.setLanguage(Locale.US);
        if (languageStatus == TextToSpeech.LANG_MISSING_DATA || languageStatus == TextToSpeech.LANG_NOT_SUPPORTED) {
          failed = true;
          ready = false;
          Log.w(TAG, "US English TTS language data unavailable");
        }
      }
      Log.d(TAG, "TTS init ready=" + ready + " failed=" + failed);
    });
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject result = new JSObject();
    result.put("available", tts != null && !failed);
    result.put("ready", tts != null && ready);
    result.put("platform", "android");
    result.put("message", ready ? "Android TextToSpeech ready." : (failed ? "Android TextToSpeech unavailable." : "Android TextToSpeech initializing."));
    call.resolve(result);
  }

  @PluginMethod
  public void speak(PluginCall call) {
    if (tts == null || !ready) {
      call.reject(failed ? "Android TextToSpeech unavailable." : "Android TextToSpeech is still initializing.");
      return;
    }

    String text = call.getString("text", "");
    if (text == null || text.trim().isEmpty()) {
      call.reject("Text is required.");
      return;
    }

    Double rateValue = call.getDouble("rate", 1.0);
    Double pitchValue = call.getDouble("pitch", 1.0);
    Double volumeValue = call.getDouble("volume", 1.0);
    float rate = clampFloat(rateValue != null ? rateValue.floatValue() : 1.0f, 0.1f, 2.0f);
    float pitch = clampFloat(pitchValue != null ? pitchValue.floatValue() : 1.0f, 0.1f, 2.0f);
    float volume = clampFloat(volumeValue != null ? volumeValue.floatValue() : 1.0f, 0.0f, 1.0f);

    tts.setSpeechRate(rate);
    tts.setPitch(pitch);

    Bundle params = new Bundle();
    params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume);
    String utteranceId = "neo-tts-" + System.currentTimeMillis();
    int status = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);

    JSObject result = new JSObject();
    result.put("ok", status == TextToSpeech.SUCCESS);
    result.put("message", status == TextToSpeech.SUCCESS ? "Android TTS preview started." : "Android TTS failed to start.");
    if (status == TextToSpeech.SUCCESS) {
      call.resolve(result);
    } else {
      call.reject("Android TextToSpeech failed to start.");
    }
  }

  @PluginMethod
  public void stop(PluginCall call) {
    boolean ok = tts != null && tts.stop() == TextToSpeech.SUCCESS;
    JSObject result = new JSObject();
    result.put("ok", ok);
    result.put("message", ok ? "Android TTS stopped." : "No Android TTS utterance was active.");
    call.resolve(result);
  }

  @Override
  public void handleOnDestroy() {
    if (tts != null) {
      try {
        tts.stop();
        tts.shutdown();
      } catch (Exception ignored) {
      }
      tts = null;
      ready = false;
    }
    super.handleOnDestroy();
  }

  private float clampFloat(float value, float min, float max) {
    return Math.max(min, Math.min(max, value));
  }
}
