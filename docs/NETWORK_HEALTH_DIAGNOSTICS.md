# Network Health and Diagnostics

NEO computes a health score from available network evidence. It does not display fake throughput or speed-test values.

## Score Formula

The score starts at 100 and subtracts impact factors:

- Gateway unreachable or disconnected: `-25`
- Gateway latency over 100ms: `-8`
- Internet known-host reachability failed: `-15`
- DNS-over-HTTPS resolution failed: `-10`
- Average local device latency over 100ms: `-10`
- Average local device latency over 250ms: `-20`
- Unknown/new devices: `-5` each, capped at `-20`
- Trusted offline devices: `-8` each, capped at `-20`
- Recent scan failures: `-10` each, capped at `-20`
- Unread high/medium alerts: high `-12`, medium `-6`, capped at `-25`
- Latest scan changed devices: `-2` each, capped at `-10`

Grades:

- `90-100`: Excellent
- `75-89`: Good
- `60-74`: Watch
- `40-59`: Degraded
- `0-39`: Critical

## Diagnostics

Implemented probes:

- Gateway latency timing probe using browser-safe HTTP fetch timing to the configured gateway.
- Internet reachability probe using `https://www.gstatic.com/generate_204`.
- DNS resolution probe using DNS-over-HTTPS at `https://dns.google/resolve`.
- Gateway jitter estimate from repeated gateway timing samples.
- Probe failure percentage as a packet-loss approximation from failed gateway timing samples.

These are not ICMP ping results. Browser, WebView, mixed-content policy, CORS, firewall, and captive-portal behavior can make a probe unavailable even when the network is otherwise usable.

## Unsupported On Purpose

Throughput and Mbps speed testing are not implemented. A true speed test needs a provider/server and should not be represented by a fake animated meter.

The code exposes a `throughput` diagnostic entry marked `not-run` so a future provider-backed implementation can plug in without changing the UI contract.

