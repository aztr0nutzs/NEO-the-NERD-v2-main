# Codex Browser Defect Ledger

| ID | Severity | Screen | Reproduction Steps | Expected | Actual | Evidence | Suspected File/Area | Browser-limited or Genuine |
|---|---|---|---|---|---|---|---|---|
| CBF-001 | Critical | Full app interactive pass | Start validation in current shell-only Codex session and attempt manual UI traversal | Interactive browser should be available | No interactive browser surface available | Command logs in test report | Environment/tooling | Browser-limited |
| CBF-002 | High | Android sync path | Run `npm run android:sync` | Capacitor sync should complete | Fails: Capacitor CLI requires Node >=22 | Command output in report section 2 | Toolchain/runtime | Genuine environment blocker |
| CBF-003 | High | Dev server probe | Start `npm run dev`, then `curl http://localhost:3000` | HTTP response should return | curl request hung in this shell context | Command logs | Environment networking bridge | Browser-limited (needs further confirmation) |
