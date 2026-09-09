package com.ovhndl.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(VenueWifiPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
