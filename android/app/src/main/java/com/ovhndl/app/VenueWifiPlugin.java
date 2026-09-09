package com.ovhndl.app;

import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Read-only bridge used for attendance verification. It never joins or scans
 * networks; it only reports the currently connected Wi-Fi network to the app.
 */
@CapacitorPlugin(name = "VenueWifi")
public class VenueWifiPlugin extends Plugin {
  @PluginMethod
  public void getCurrentNetwork(PluginCall call) {
    try {
      WifiManager wifiManager = (WifiManager) getContext()
          .getApplicationContext()
          .getSystemService(Context.WIFI_SERVICE);

      if (wifiManager == null || !wifiManager.isWifiEnabled()) {
        call.reject("Wi-Fi is not enabled.");
        return;
      }

      WifiInfo info = wifiManager.getConnectionInfo();
      String ssid = info == null ? null : info.getSSID();
      if (ssid == null || ssid.isEmpty() || "<unknown ssid>".equals(ssid)) {
        call.reject("Connected Wi-Fi name is unavailable. Grant the required Wi-Fi permission and enable Location on older Android devices.");
        return;
      }

      JSObject result = new JSObject();
      result.put("ssid", ssid.replace("\"", ""));
      result.put("bssid", info.getBSSID());
      call.resolve(result);
    } catch (SecurityException error) {
      call.reject("Wi-Fi permission was not granted.", error);
    } catch (Exception error) {
      call.reject("Could not verify the current Wi-Fi network.", error);
    }
  }
}
