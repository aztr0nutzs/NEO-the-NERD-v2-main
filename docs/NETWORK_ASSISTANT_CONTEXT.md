# Network-Aware Assistant

NEO injects compact network context into chat only when a prompt matches a network intent.

## Intent Categories

- `explain-network`
- `summarize-changes`
- `suspicious-device`
- `diagnose-slow-network`
- `scan-status`
- `device-identity-question`
- `monitoring-status`

## Context Payload

The assistant receives a compact `NetworkAssistantContext`:

- current network status counts and scan state
- latest scan delta
- latest health score, grade, trend, top factors, and diagnostics labels
- unknown/new devices
- watch devices
- offline devices
- recent timeline events
- recent alerts
- router control mode and capability summaries
- monitoring scheduler/notification status

Device payloads are intentionally compact: display name, IP address, device type, trust state, and ID only. The assistant should not dump raw MAC addresses or full history unless a future UI explicitly requests it.

## Grounding Rules

For network prompts, local responses are generated from `NetworkAssistantContext` before response vault templates are considered. This prevents generic templates from overriding actual network facts.

Provider prompts include the same context as JSON plus instructions to use only supplied facts for network answers. If the provider is unavailable, the local engine answers from the same payload.

