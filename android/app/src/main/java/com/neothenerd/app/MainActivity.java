package com.neothenerd.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    registerPlugin(NeoNetworkPlugin.class);
    registerPlugin(NeoTtsPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
