package com.neothenerd.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.Set;
import android.speech.tts.Voice;

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
    result.put("nativeVoiceCount", getNativeVoiceCount());
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
    String voiceName = call.getString("voiceName", null);
    float rate = clampFloat(rateValue != null ? rateValue.floatValue() : 1.0f, 0.1f, 2.0f);
    float pitch = clampFloat(pitchValue != null ? pitchValue.floatValue() : 1.0f, 0.1f, 2.0f);
    float volume = clampFloat(volumeValue != null ? volumeValue.floatValue() : 1.0f, 0.0f, 1.0f);

    VoiceSelection selectedVoice = selectVoiceByName(voiceName);
    if (voiceName != null && !voiceName.trim().isEmpty() && !selectedVoice.supported) {
      call.reject("Requested Android TTS voice is not installed: " + voiceName);
      return;
    }
    tts.setSpeechRate(rate);
    tts.setPitch(pitch);

    Bundle params = new Bundle();
    params.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume);
    String utteranceId = "neo-tts-" + System.currentTimeMillis();
    int status = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId);

    JSObject result = new JSObject();
    result.put("ok", status == TextToSpeech.SUCCESS);
    result.put("message", status == TextToSpeech.SUCCESS ? "Android TTS preview started." : "Android TTS failed to start.");
    result.put("voiceName", selectedVoice.name);
    result.put("nativeVoiceCount", getNativeVoiceCount());
    if (status == TextToSpeech.SUCCESS) {
      call.resolve(result);
    } else {
      call.reject("Android TextToSpeech failed to start.");
    }
  }

  @PluginMethod
  public void getVoices(PluginCall call) {
    JSObject result = new JSObject();
    JSArray voices = new JSArray();

    if (tts == null || !ready) {
      result.put("voices", voices);
      result.put("available", false);
      result.put("message", failed ? "Android TextToSpeech unavailable." : "Android TextToSpeech initializing.");
      call.resolve(result);
      return;
    }

    try {
      Set<Voice> nativeVoices = tts.getVoices();
      if (nativeVoices != null) {
        for (Voice voice : nativeVoices) {
          JSObject entry = new JSObject();
          entry.put("name", voice.getName());
          entry.put("locale", voice.getLocale() != null ? voice.getLocale().toLanguageTag() : "");
          entry.put("quality", voice.getQuality());
          entry.put("latency", voice.getLatency());
          entry.put("networkConnectionRequired", voice.isNetworkConnectionRequired());
          voices.put(entry);
        }
      }
      result.put("voices", voices);
      result.put("available", voices.length() > 0);
      result.put("message", voices.length() > 0 ? "Android TextToSpeech voices enumerated." : "No selectable Android voices reported by engine.");
      call.resolve(result);
    } catch (Exception ex) {
      call.reject("Failed to enumerate Android TextToSpeech voices: " + ex.getMessage());
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

  private int getNativeVoiceCount() {
    if (tts == null || !ready) return 0;
    try {
      Set<Voice> voices = tts.getVoices();
      return voices != null ? voices.size() : 0;
    } catch (Exception ignored) {
      return 0;
    }
  }

  private VoiceSelection selectVoiceByName(String voiceName) {
    if (voiceName == null || voiceName.trim().isEmpty() || tts == null) return new VoiceSelection(null, true);
    try {
      Set<Voice> voices = tts.getVoices();
      if (voices == null) return new VoiceSelection(null, false);
      for (Voice voice : voices) {
        if (voice.getName().equals(voiceName)) {
          int result = tts.setVoice(voice);
          return new VoiceSelection(result == TextToSpeech.SUCCESS ? voice.getName() : null, result == TextToSpeech.SUCCESS);
        }
      }
    } catch (Exception ignored) {
    }
    return new VoiceSelection(null, false);
  }

  private static class VoiceSelection {
    final String name;
    final boolean supported;

    VoiceSelection(String name, boolean supported) {
      this.name = name;
      this.supported = supported;
    }
  }
}
