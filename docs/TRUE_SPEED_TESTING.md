# TRUE SPEED TESTING

## What is measured
- **Request latency**: HTTPS request round-trip time to configured endpoint (not ICMP ping).
- **Jitter approximation**: standard deviation of repeated request-latency samples.
- **Download throughput**: bytes actually received over HTTPS divided by elapsed time.
- **Upload throughput**: bytes actually sent to configured upload endpoint divided by elapsed time.

## What is not measured
- Raw Layer-2 Wi-Fi PHY rate.
- ICMP ping latency.
- Per-device LAN transfer speeds unless a dedicated local agent/server is provided.

## Architecture
- Current default mode: `internet` using HTTPS endpoints.
- Provider is explicit in result metadata.
- Endpoint model is replaceable and supports `custom-endpoint` and future `local-agent` modes.

## Accuracy caveats
- Browser fetch path, TLS setup, and endpoint geography influence results.
- Android/webview background policy can affect timing consistency.
- Results can differ from commercial speed apps that use parallel sockets and provider-owned server pools.

## Test flow
1. Latency phase: repeated small HTTPS requests.
2. Download phase: stream bytes from configured URL and compute Mbps from transferred bytes/time.
3. Upload phase: optional, only if upload endpoint is configured and accepts POST.
4. Persist into diagnostics and health snapshot for UI/report use.

## Configuration guidance
- Use nearby HTTPS endpoints for stable latency.
- For upload, configure an endpoint under your control to avoid third-party policy breakage.
- If no upload endpoint exists, upload is reported as unavailable (`n/a`) and never fabricated.
