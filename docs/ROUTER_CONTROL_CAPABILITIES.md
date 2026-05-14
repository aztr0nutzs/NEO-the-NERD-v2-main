# Router Control Capabilities

## Why this layer exists
Generic local-network discovery does **not** imply generic router control. Reboot/guest/QoS operations are vendor-specific and usually require authenticated router APIs.

## Current truthful support
- **Refresh status context**: available (reads adapter/router status context).
- **Reboot router**: requires connector unless explicit connector-backed implementation exists.
- **Toggle guest Wi-Fi**: requires connector unless explicit connector-backed implementation exists.
- **Toggle QoS**: requires connector unless explicit connector-backed implementation exists.

## Control modes
- `read-only`: default safe mode for native discovery without control connector.
- `demo`: simulated behavior only, explicitly labeled.
- `connector-backed`: reserved for future authenticated vendor integrations.

## Capability statuses
Each router action exposes one of:
- `available`
- `unsupported`
- `requires-connector`
- `demo-only`
- `unknown`

## Action outcome truth
Action execution returns:
- `success`: actual execution occurred.
- `queued-demo`: demo simulation only.
- `unsupported`: operation known unsupported.
- `requires-connector`: operation not attempted; connector needed.
- `failed`: attempted path failed.

## Future connector integration
Future router connectors should attach at adapter level via:
- `getRouterCapabilities()`
- `getRouterControlMode()`
- `executeRouterAction(action, payload)`

Connectors must set capabilities and mode based on real authenticated support, and only return `success` when a real operation executed.
