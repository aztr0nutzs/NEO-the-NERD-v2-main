# Network HUD Upgrade Notes

## Upgraded Components
- `NerdControlPanel`
- `NetworkOverviewPanel`
- `NetworkDiscoveryFeature` (card interaction wiring)

## State-driven animations
- Scan sweep overlay on overview metric cards when `scanState === "scanning"`.
- Count-up transition for metric values on value changes.
- Flagged metric icon pulse only when flagged count > 0.

## Added interactions (no dead taps)
- Overview cards:
  - Devices/Online -> opens Devices tab
  - New/Unknown + Flagged -> opens Security tab
  - Scan HUD row -> opens Scan tab
- NERD panel cards:
  - Online devices -> Devices tab
  - Flagged devices -> Security tab
  - Queued actions -> Scan tab/queue context
  - Adapter status row -> Scan tab

## Truth constraints
- No fake live claims were added.
- Demo/live/fallback labels remain sourced from existing adapter status logic.
- Animated states reflect real runtime fields (`scanState`, flagged count, queue count, etc.).
