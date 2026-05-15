package com.neothenerd.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

@CapacitorPlugin(name = "NeoNetwork")
public class NeoNetworkPlugin extends Plugin {
  private static final String TAG = "NeoNetworkPlugin";

  @PluginMethod
  public void getLocalNetworkContext(PluginCall call) {
    JSObject result = buildLocalNetworkContext();
    Log.d(TAG, "getLocalNetworkContext success limitedData=" + result.optBoolean("limitedData", true));
    call.resolve(result);
  }

  @PluginMethod
  public void getGatewayInfo(PluginCall call) {
    JSObject result = new JSObject();
    String gatewayIp = readGatewayIp();
    boolean reachable = isHostReachable(gatewayIp, 80, 600) || isHostReachable(gatewayIp, 443, 600);
    result.put("gatewayIp", gatewayIp);
    result.put("hostname", resolveHostname(gatewayIp));
    result.put("reachable", reachable);
    result.put("dataLimited", gatewayIp == null);
    Log.d(TAG, "getGatewayInfo success hasGatewayIp=" + (gatewayIp != null) + " reachable=" + reachable);
    call.resolve(result);
  }

  @PluginMethod
  public void scanLocalSubnet(PluginCall call) {
    String scanMode = call.getString("scanMode", "balanced");
    ScanProfile profile = getScanProfile(scanMode, call);
    int maxHosts = profile.maxHosts;
    int timeoutMs = profile.timeoutMs;
    List<Integer> commonPorts = profile.ports;
    Log.d(TAG, "scanLocalSubnet started scanMode=" + scanMode + " maxHosts=" + maxHosts + " timeoutMs=" + timeoutMs);

    JSObject context = buildLocalNetworkContext();
    String localIp = context.getString("localIp");
    Integer prefixLength = context.has("prefixLength") ? context.getInteger("prefixLength") : null;

    JSObject response = new JSObject();
    response.put("scanMode", scanMode);
    response.put("adapterStatus", "active");
    response.put("limitedData", false);

    if (localIp == null || prefixLength == null || prefixLength < 16 || prefixLength > 30) {
      response.put("hosts", new JSArray());
      response.put("limitedData", true);
      response.put("message", "Local subnet unavailable for safe bounded scan.");
      Log.d(TAG, "scanLocalSubnet limited-data scanMode=" + scanMode + " reason=local-subnet-unavailable");
      call.resolve(response);
      return;
    }

    List<String> targets = enumerateSubnet(localIp, prefixLength, maxHosts);
    Map<String, String> arpCache = readArpCache();
    int concurrency = Math.min(24, Math.max(4, profile.concurrency));

    ExecutorService executor = Executors.newFixedThreadPool(concurrency);
    List<Future<JSObject>> futures = new ArrayList<>();

    for (String ip : targets) {
      futures.add(executor.submit(new HostProbe(ip, timeoutMs, commonPorts, arpCache, profile.resolveHostname, context.getString("gatewayIp"))));
    }

    List<JSObject> discovered = new ArrayList<>();
    for (Future<JSObject> future : futures) {
      try {
        JSObject host = future.get(timeoutMs + 350L, TimeUnit.MILLISECONDS);
        if (host != null) {
          discovered.add(host);
        }
      } catch (Exception ignored) {
      }
    }

    executor.shutdownNow();
    Collections.sort(discovered, Comparator.comparing(o -> o.getString("ipAddress", "")));

    JSArray hosts = new JSArray();
    for (JSObject host : discovered) {
      hosts.put(host);
    }

    response.put("hosts", hosts);
    response.put("localContext", context);
    response.put("scannedHosts", targets.size());
    response.put("discoveredHosts", discovered.size());
    response.put("message", "Bounded local subnet scan complete.");
    Log.d(TAG, "scanLocalSubnet completed scanMode=" + scanMode + " scannedHosts=" + targets.size() + " discoveredHosts=" + discovered.size());
    call.resolve(response);
  }

  private JSObject buildLocalNetworkContext() {
    JSObject result = new JSObject();
    ConnectivityManager cm = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);

    String localIp = null;
    Integer prefixLength = null;
    String connectionType = "unknown";

    if (cm != null) {
      Network network = cm.getActiveNetwork();
      if (network != null) {
        NetworkCapabilities capabilities = cm.getNetworkCapabilities(network);
        if (capabilities != null) {
          if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
            connectionType = "wifi";
          } else if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
            connectionType = "cellular";
          }
        }

        LinkProperties linkProperties = cm.getLinkProperties(network);
        if (linkProperties != null) {
          for (LinkAddress linkAddress : linkProperties.getLinkAddresses()) {
            InetAddress inetAddress = linkAddress.getAddress();
            String hostAddress = inetAddress != null ? inetAddress.getHostAddress() : null;
            if (hostAddress != null && hostAddress.contains(".") && !hostAddress.startsWith("127.")) {
              localIp = hostAddress;
              prefixLength = linkAddress.getPrefixLength();
              break;
            }
          }
        }
      }
    }

    String gatewayIp = readGatewayIp();
    String networkName = readWifiSsid();

    result.put("localIp", localIp);
    result.put("gatewayIp", gatewayIp);
    result.put("prefixLength", prefixLength);
    result.put("subnet", localIp != null && prefixLength != null ? localIp + "/" + prefixLength : null);
    result.put("networkName", networkName);
    result.put("connectionType", connectionType);
    result.put("adapterStatus", "active");
    result.put("limitedData", localIp == null || prefixLength == null);
    return result;
  }

  private String readWifiSsid() {
    try {
      WifiManager wifiManager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
      if (wifiManager == null) return null;
      WifiInfo wifiInfo = wifiManager.getConnectionInfo();
      if (wifiInfo == null) return null;
      String ssid = wifiInfo.getSSID();
      if (ssid == null || ssid.equals("<unknown ssid>")) return null;
      return ssid.replace("\"", "");
    } catch (Exception ignored) {
      return null;
    }
  }

  private String readGatewayIp() {
    try (BufferedReader reader = new BufferedReader(new FileReader(new File("/proc/net/route")))) {
      String line;
      while ((line = reader.readLine()) != null) {
        String[] parts = line.trim().split("\\s+");
        if (parts.length > 2 && "00000000".equals(parts[1])) {
          return hexLittleEndianToIp(parts[2]);
        }
      }
    } catch (Exception ignored) {}
    return null;
  }

  private String hexLittleEndianToIp(String hex) {
    try {
      long value = Long.parseLong(hex, 16);
      return String.format(Locale.US, "%d.%d.%d.%d", value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
    } catch (Exception ex) {
      return null;
    }
  }

  private Map<String, String> readArpCache() {
    Map<String, String> entries = new HashMap<>();
    try (BufferedReader reader = new BufferedReader(new FileReader(new File("/proc/net/arp")))) {
      String line;
      while ((line = reader.readLine()) != null) {
        if (line.startsWith("IP") || line.trim().isEmpty()) continue;
        String[] parts = line.trim().split("\\s+");
        if (parts.length >= 4) entries.put(parts[0], parts[3]);
      }
    } catch (Exception ignored) {}
    return entries;
  }


  private static class ScanProfile {
    final int maxHosts;
    final int timeoutMs;
    final int concurrency;
    final boolean resolveHostname;
    final List<Integer> ports;

    ScanProfile(int maxHosts, int timeoutMs, int concurrency, boolean resolveHostname, List<Integer> ports) {
      this.maxHosts = maxHosts;
      this.timeoutMs = timeoutMs;
      this.concurrency = concurrency;
      this.resolveHostname = resolveHostname;
      this.ports = ports;
    }
  }

  private ScanProfile getScanProfile(String scanMode, PluginCall call) {
    if ("quick".equals(scanMode)) {
      return new ScanProfile(
        call.getInt("maxHosts", 48),
        call.getInt("timeoutMs", 320),
        8,
        false,
        parsePorts(call.getArray("commonPorts"), Arrays.asList(80, 443))
      );
    }

    if ("deep".equals(scanMode)) {
      return new ScanProfile(
        call.getInt("maxHosts", 220),
        call.getInt("timeoutMs", 1400),
        18,
        true,
        parsePorts(call.getArray("commonPorts"), Arrays.asList(80, 443, 53, 22, 445, 8080, 8443, 139))
      );
    }

    return new ScanProfile(
      call.getInt("maxHosts", 128),
      call.getInt("timeoutMs", 700),
      12,
      true,
      parsePorts(call.getArray("commonPorts"), Arrays.asList(80, 443, 53, 22, 445, 8080))
    );
  }

  private List<Integer> parsePorts(JSArray portArray, List<Integer> defaults) {
    if (portArray == null || portArray.length() == 0) return defaults;
    List<Integer> ports = new ArrayList<>();
    for (int i = 0; i < portArray.length(); i++) {
      Integer port = portArray.optInt(i);
      if (port != null && port > 0 && port <= 65535) ports.add(port);
    }
    return ports.isEmpty() ? defaults : ports;
  }

  private String serviceLabelForPort(int port) {
    switch (port) {
      case 80: return "Possible service: HTTP (tcp/80)";
      case 443: return "Possible service: HTTPS (tcp/443)";
      case 22: return "Possible service: SSH (tcp/22)";
      case 445: return "Possible service: SMB (tcp/445)";
      case 53: return "Possible service: DNS (tcp/53)";
      default: return "Possible service: tcp/" + port;
    }
  }

  private String normalizeMac(String macAddress) {
    if (macAddress == null) return null;
    String trimmed = macAddress.trim();
    if (trimmed.isEmpty() || "00:00:00:00:00:00".equals(trimmed)) return null;
    return trimmed.toUpperCase(Locale.US);
  }

  private String confidenceFor(Set<String> discoverySources, JSArray openPorts, String hostname, String macAddress) {
    int score = 0;
    if (discoverySources.contains("gateway")) score += 2;
    if (discoverySources.contains("arp")) score += 2;
    if (discoverySources.contains("tcp-probe")) score += 2;
    if (hostname != null) score += 1;
    if (openPorts.length() > 0) score += 1;
    if (macAddress != null) score += 1;
    if (score >= 6) return "high";
    if (score >= 3) return "medium";
    return "low";
  }

  private List<Integer> getCommonPorts(PluginCall call) {
    JSArray portArray = call.getArray("commonPorts");
    if (portArray == null || portArray.length() == 0) {
      List<Integer> defaults = new ArrayList<>();
      Collections.addAll(defaults, 80, 443, 53, 22, 445, 8080);
      return defaults;
    }

    List<Integer> ports = new ArrayList<>();
    for (int i = 0; i < portArray.length(); i++) {
      Integer port = portArray.optInt(i);
      if (port != null && port > 0 && port <= 65535) ports.add(port);
    }
    return ports;
  }

  private int getDefaultMaxHosts(String scanMode) {
    if ("quick".equals(scanMode)) return 64;
    if ("deep".equals(scanMode)) return 254;
    return 128;
  }

  private int getDefaultTimeoutMs(String scanMode) {
    if ("quick".equals(scanMode)) return 350;
    if ("deep".equals(scanMode)) return 1200;
    return 700;
  }

  private List<String> enumerateSubnet(String localIp, int prefixLength, int maxHosts) {
    try {
      long ipLong = ipv4ToLong(localIp);
      long mask = prefixLength == 0 ? 0 : 0xffffffffL << (32 - prefixLength);
      long network = ipLong & mask;
      long broadcast = network | ~mask & 0xffffffffL;
      List<String> ips = new ArrayList<>();
      for (long host = network + 1; host < broadcast && ips.size() < maxHosts; host++) {
        String candidate = longToIpv4(host);
        if (!candidate.equals(localIp)) ips.add(candidate);
      }
      return ips;
    } catch (Exception ex) {
      return Collections.emptyList();
    }
  }

  private long ipv4ToLong(String ip) {
    String[] parts = ip.split("\\.");
    long result = 0;
    for (String part : parts) {
      result = result << 8;
      result |= Integer.parseInt(part) & 0xff;
    }
    return result;
  }

  private String longToIpv4(long ip) {
    return String.format(Locale.US, "%d.%d.%d.%d", (ip >> 24) & 0xff, (ip >> 16) & 0xff, (ip >> 8) & 0xff, ip & 0xff);
  }

  private String resolveHostname(String ip) {
    if (ip == null) return null;
    try {
      String name = InetAddress.getByName(ip).getCanonicalHostName();
      return name.equals(ip) ? null : name;
    } catch (UnknownHostException ex) {
      return null;
    }
  }

  private boolean isHostReachable(String ip, int port, int timeoutMs) {
    if (ip == null) return false;
    try (Socket socket = new Socket()) {
      socket.connect(new InetSocketAddress(ip, port), timeoutMs);
      return true;
    } catch (Exception ex) {
      return false;
    }
  }

  private class HostProbe implements Callable<JSObject> {
    private final String ip;
    private final int timeoutMs;
    private final List<Integer> ports;
    private final Map<String, String> arpCache;
    private final boolean resolveHostnameEnabled;
    private final String gatewayIp;

    HostProbe(String ip, int timeoutMs, List<Integer> ports, Map<String, String> arpCache, boolean resolveHostnameEnabled, String gatewayIp) {
      this.ip = ip;
      this.timeoutMs = timeoutMs;
      this.ports = ports;
      this.arpCache = arpCache;
      this.resolveHostnameEnabled = resolveHostnameEnabled;
      this.gatewayIp = gatewayIp;
    }

    @Override
    public JSObject call() {
      long start = System.nanoTime();
      JSArray openPorts = new JSArray();
      Set<String> services = new HashSet<>();
      Set<String> discoverySources = new HashSet<>();

      for (Integer port : ports) {
        if (isHostReachable(ip, port, timeoutMs)) {
          openPorts.put(port);
          services.add(serviceLabelForPort(port));
          discoverySources.add("tcp-probe");
        }
      }

      String macAddress = normalizeMac(arpCache.get(ip));
      if (macAddress != null) discoverySources.add("arp");
      if (ip != null && ip.equals(gatewayIp)) discoverySources.add("gateway");
      boolean reachable = openPorts.length() > 0 || macAddress != null || ip.equals(gatewayIp);
      if (!reachable) return null;

      JSObject host = new JSObject();
      host.put("ipAddress", ip);
      host.put("status", "online");
      String hostname = resolveHostnameEnabled ? resolveHostname(ip) : null;
      if (hostname != null) discoverySources.add("hostname");
      host.put("hostname", hostname);
      host.put("macAddress", macAddress);
      host.put("vendor", "Unavailable");
      host.put("openPorts", openPorts);
      JSArray serviceArray = new JSArray();
      for (String service : services) serviceArray.put(service);
      host.put("services", serviceArray);
      JSArray sourceArray = new JSArray();
      for (String source : discoverySources) sourceArray.put(source);
      host.put("discoverySources", sourceArray);
      host.put("confidence", confidenceFor(discoverySources, openPorts, hostname, macAddress));
      host.put("lastScanSource", discoverySources.contains("tcp-probe") ? "tcp-probe" : discoverySources.contains("arp") ? "arp" : "gateway");
      host.put("latencyMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start));
      host.put("dataLimited", macAddress == null || hostname == null);
      return host;
    }
  }
}
