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

import org.json.JSONArray;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.net.Socket;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
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
      futures.add(executor.submit(new HostProbe(ip, timeoutMs, commonPorts, arpCache, profile.useArpCache, profile.resolveHostname, context.getString("gatewayIp"))));
    }

    Map<String, JSObject> discoveredByIp = new HashMap<>();
    for (Future<JSObject> future : futures) {
      try {
        JSObject host = future.get(timeoutMs + 350L, TimeUnit.MILLISECONDS);
        if (host != null) {
          mergeHost(discoveredByIp, host);
        }
      } catch (Exception ignored) {
      }
    }

    executor.shutdownNow();

    if (profile.useSsdp) {
      for (JSObject host : discoverSsdpDevices(localIp, prefixLength, arpCache, profile)) {
        mergeHost(discoveredByIp, host);
      }
    }

    List<JSObject> discovered = new ArrayList<>(discoveredByIp.values());
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
    final boolean useArpCache;
    final boolean useSsdp;
    final List<Integer> ports;

    ScanProfile(int maxHosts, int timeoutMs, int concurrency, boolean resolveHostname, boolean useArpCache, boolean useSsdp, List<Integer> ports) {
      this.maxHosts = maxHosts;
      this.timeoutMs = timeoutMs;
      this.concurrency = concurrency;
      this.resolveHostname = resolveHostname;
      this.useArpCache = useArpCache;
      this.useSsdp = useSsdp;
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
        false,
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
        true,
        true,
        parsePorts(call.getArray("commonPorts"), Arrays.asList(80, 443, 53, 22, 445, 8080, 8443, 139))
      );
    }

    return new ScanProfile(
      call.getInt("maxHosts", 128),
      call.getInt("timeoutMs", 700),
      12,
      true,
      true,
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
      case 139: return "Possible service: NetBIOS/SMB (tcp/139)";
      case 8080: return "Possible service: alternate HTTP (tcp/8080)";
      case 8443: return "Possible service: alternate HTTPS (tcp/8443)";
      default: return "Possible service: tcp/" + port;
    }
  }

  private String normalizeMac(String macAddress) {
    if (macAddress == null) return null;
    String trimmed = macAddress.trim();
    if (trimmed.isEmpty() || "00:00:00:00:00:00".equals(trimmed)) return null;
    return trimmed.toUpperCase(Locale.US);
  }

  private String confidenceFor(Set<String> discoverySources, JSONArray openPorts, String hostname, String macAddress) {
    int score = 0;
    if (discoverySources.contains("gateway")) score += 2;
    if (discoverySources.contains("arp")) score += 2;
    if (discoverySources.contains("tcp-probe")) score += 2;
    if (discoverySources.contains("ssdp")) score += 2;
    if (discoverySources.contains("mdns")) score += 2;
    if (hostname != null) score += 1;
    if (openPorts.length() > 0) score += 1;
    if (macAddress != null) score += 1;
    if (score >= 6) return "high";
    if (score >= 3) return "medium";
    return "low";
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

  private List<JSObject> discoverSsdpDevices(String localIp, int prefixLength, Map<String, String> arpCache, ScanProfile profile) {
    List<JSObject> hosts = new ArrayList<>();
    String request = "M-SEARCH * HTTP/1.1\r\n" +
      "HOST: 239.255.255.250:1900\r\n" +
      "MAN: \"ssdp:discover\"\r\n" +
      "MX: 1\r\n" +
      "ST: ssdp:all\r\n\r\n";
    int timeoutMs = Math.min(2600, Math.max(900, profile.timeoutMs * 2));
    long deadline = System.currentTimeMillis() + timeoutMs;

    try (DatagramSocket socket = new DatagramSocket()) {
      socket.setSoTimeout(350);
      byte[] payload = request.getBytes(StandardCharsets.UTF_8);
      DatagramPacket packet = new DatagramPacket(
        payload,
        payload.length,
        InetAddress.getByName("239.255.255.250"),
        1900
      );
      socket.send(packet);

      while (System.currentTimeMillis() < deadline) {
        byte[] buffer = new byte[4096];
        DatagramPacket response = new DatagramPacket(buffer, buffer.length);
        try {
          socket.receive(response);
        } catch (SocketTimeoutException timeout) {
          continue;
        }

        String responseIp = response.getAddress() != null ? response.getAddress().getHostAddress() : null;
        if (responseIp == null || !isIpInSubnet(responseIp, localIp, prefixLength)) continue;
        String text = new String(response.getData(), 0, response.getLength(), StandardCharsets.UTF_8);
        hosts.add(buildSsdpHost(responseIp, text, arpCache, profile.resolveHostname));
      }
    } catch (Exception ex) {
      Log.d(TAG, "SSDP discovery skipped: " + ex.getMessage());
    }

    return hosts;
  }

  private JSObject buildSsdpHost(String ip, String responseText, Map<String, String> arpCache, boolean resolveHostnameEnabled) {
    Set<String> discoverySources = new HashSet<>();
    discoverySources.add("ssdp");
    String macAddress = normalizeMac(arpCache.get(ip));
    if (macAddress != null) discoverySources.add("arp");
    String hostname = resolveHostnameEnabled ? resolveHostname(ip) : null;
    if (hostname != null) discoverySources.add("hostname");

    JSArray openPorts = new JSArray();
    Set<String> services = new HashSet<>();
    services.add("Possible service: SSDP/UPnP response");
    String server = parseSsdpHeader(responseText, "SERVER");
    if (server != null) services.add("SSDP server: " + sanitizeSsdpValue(server));
    String st = parseSsdpHeader(responseText, "ST");
    if (st != null) services.add("SSDP target: " + sanitizeSsdpValue(st));

    JSObject host = new JSObject();
    host.put("ipAddress", ip);
    host.put("status", "online");
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
    host.put("lastScanSource", "ssdp");
    host.put("dataLimited", macAddress == null || hostname == null);
    return host;
  }

  private String parseSsdpHeader(String responseText, String headerName) {
    String prefix = headerName.toLowerCase(Locale.US) + ":";
    String[] lines = responseText.split("\\r?\\n");
    for (String line : lines) {
      String trimmed = line.trim();
      if (trimmed.toLowerCase(Locale.US).startsWith(prefix)) {
        return trimmed.substring(prefix.length()).trim();
      }
    }
    return null;
  }

  private String sanitizeSsdpValue(String value) {
    String cleaned = value.replaceAll("[\\r\\n\\t]", " ").trim();
    return cleaned.length() > 90 ? cleaned.substring(0, 90) + "..." : cleaned;
  }

  private boolean isIpInSubnet(String candidateIp, String localIp, int prefixLength) {
    try {
      long candidate = ipv4ToLong(candidateIp);
      long local = ipv4ToLong(localIp);
      long mask = prefixLength == 0 ? 0 : (0xffffffffL << (32 - prefixLength)) & 0xffffffffL;
      return (candidate & mask) == (local & mask);
    } catch (Exception ex) {
      return false;
    }
  }

  private void mergeHost(Map<String, JSObject> hostsByIp, JSObject incoming) {
    String ip = incoming.getString("ipAddress", null);
    if (ip == null) return;
    JSObject existing = hostsByIp.get(ip);
    if (existing == null) {
      hostsByIp.put(ip, incoming);
      return;
    }

    String hostname = existing.getString("hostname", null);
    String incomingHostname = incoming.getString("hostname", null);
    if (hostname == null && incomingHostname != null) existing.put("hostname", incomingHostname);

    String mac = existing.getString("macAddress", null);
    String incomingMac = incoming.getString("macAddress", null);
    if (mac == null && incomingMac != null) existing.put("macAddress", incomingMac);

    existing.put("openPorts", unionJsonArrays(existing.optJSONArray("openPorts"), incoming.optJSONArray("openPorts")));
    existing.put("services", unionJsonArrays(existing.optJSONArray("services"), incoming.optJSONArray("services")));
    JSArray sources = unionJsonArrays(existing.optJSONArray("discoverySources"), incoming.optJSONArray("discoverySources"));
    existing.put("discoverySources", sources);
    existing.put("lastScanSource", sourcePriority(sources));
    existing.put("confidence", confidenceFor(
      stringSetFromArray(sources),
      existing.optJSONArray("openPorts"),
      existing.getString("hostname", null),
      existing.getString("macAddress", null)
    ));
    existing.put("dataLimited", existing.getString("macAddress", null) == null || existing.getString("hostname", null) == null);
  }

  private JSArray unionJsonArrays(JSONArray first, JSONArray second) {
    JSArray result = new JSArray();
    Set<String> seen = new HashSet<>();
    addUniqueArrayValues(result, seen, first);
    addUniqueArrayValues(result, seen, second);
    return result;
  }

  private void addUniqueArrayValues(JSArray target, Set<String> seen, JSONArray source) {
    if (source == null) return;
    for (int i = 0; i < source.length(); i++) {
      Object value = source.opt(i);
      if (value == null) continue;
      String key = String.valueOf(value);
      if (seen.add(key)) target.put(value);
    }
  }

  private Set<String> stringSetFromArray(JSONArray source) {
    Set<String> result = new HashSet<>();
    if (source == null) return result;
    for (int i = 0; i < source.length(); i++) {
      String value = source.optString(i, null);
      if (value != null) result.add(value);
    }
    return result;
  }

  private String sourcePriority(JSONArray sources) {
    Set<String> sourceSet = stringSetFromArray(sources);
    if (sourceSet.contains("gateway")) return "gateway";
    if (sourceSet.contains("ssdp")) return "ssdp";
    if (sourceSet.contains("tcp-probe")) return "tcp-probe";
    if (sourceSet.contains("arp")) return "arp";
    if (sourceSet.contains("hostname")) return "hostname";
    return "tcp-probe";
  }

  private class HostProbe implements Callable<JSObject> {
    private final String ip;
    private final int timeoutMs;
    private final List<Integer> ports;
    private final Map<String, String> arpCache;
    private final boolean useArpCache;
    private final boolean resolveHostnameEnabled;
    private final String gatewayIp;

    HostProbe(String ip, int timeoutMs, List<Integer> ports, Map<String, String> arpCache, boolean useArpCache, boolean resolveHostnameEnabled, String gatewayIp) {
      this.ip = ip;
      this.timeoutMs = timeoutMs;
      this.ports = ports;
      this.arpCache = arpCache;
      this.useArpCache = useArpCache;
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

      String macAddress = useArpCache ? normalizeMac(arpCache.get(ip)) : null;
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
