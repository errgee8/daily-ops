export interface WifiVerificationResult {
  ssid?: string;
  verified: boolean;
  reason?: string;
}

type VenueWifiPlugin = {
  getCurrentNetwork: () => Promise<{ ssid: string; bssid?: string }>;
};

/**
 * Checks the native Android bridge against manager-configured SSIDs. Browser
 * builds deliberately fail closed because a browser cannot prove the SSID.
 */
export async function verifyVenueWifi(approvedSsids: string[]): Promise<WifiVerificationResult> {
  if (approvedSsids.length === 0) {
    return { verified: false, reason: 'No approved Wi-Fi network is configured for this venue.' };
  }

  const plugin = (window as unknown as { Capacitor?: { Plugins?: { VenueWifi?: VenueWifiPlugin } } })
    .Capacitor?.Plugins?.VenueWifi;
  if (!plugin) {
    return { verified: false, reason: 'Wi-Fi attendance verification is available only in the Android app.' };
  }

  try {
    const network = await plugin.getCurrentNetwork();
    const ssid = network.ssid.trim();
    const verified = approvedSsids.some(item => item.trim().toLowerCase() === ssid.toLowerCase());
    return verified
      ? { ssid, verified: true }
      : { ssid, verified: false, reason: `Connect to an approved venue Wi-Fi network before continuing.` };
  } catch (error) {
    return { verified: false, reason: error instanceof Error ? error.message : 'Unable to verify venue Wi-Fi.' };
  }
}
