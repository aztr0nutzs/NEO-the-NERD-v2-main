# Control Truth Audit

Scope: Main, Chat, Voice Library, Personalities, Games, Controls, Response Vault/Library, Settings, Network.

| Screen | Control | Prior behavior | Final behavior | File changed | Status |
|---|---|---|---|---|---|
| Main | Quick command chips | Functional; each chip sets response and may navigate | Kept; confirmed functional and intentional | N/A (verified) | functional |
| Main | TALK / TYPE / RANDOM | Functional; TALK redirects intent to Chat mic flow | Kept; truthful messaging retained | N/A (verified) | functional |
| Main | Network card CTA | Functional direct navigation | Kept as primary visible path | N/A (verified) | functional |
| Chat | Paperclip attachment button | Disabled with truthful tooltip/aria label | Kept disabled-truthfully (no silent action) | N/A (verified) | disabled-truthfully |
| Chat | Mic button | Functional where supported, disabled with reason where not | Kept; runtime-state labels retained | N/A (verified) | functional |
| Chat | Suggestion chips | Functional send/insert behavior | Kept | N/A (verified) | functional |
| Voice Library | Preview / Stop / Pause / Replay | Functional via unified voice runtime | Kept; Android native fallback path retained | N/A (verified) | functional |
| Voice Library | Generate Provider Audio | Disabled when provider unavailable with explicit reason | Kept truthful disablement | N/A (verified) | disabled-truthfully |
| Personalities | Preview Personality | Functional preview action | Kept; no dead save action | N/A (verified) | functional |
| Personalities | Custom sliders | Local-only values; explicit non-runtime banner | Kept with explicit local-preview label | N/A (verified) | relabeled |
| Games | Challenge LAUNCH + cards | Functional game launch actions | Kept | N/A (verified) | functional |
| Controls | Permission action rows | Functional where supported; unavailable rows disabled | Kept truthful unavailable state | N/A (verified) | functional |
| Settings | Import/Export/Reset app | Functional actions | Kept | N/A (verified) | functional |
| Settings | Debug mode toggle | Persisted but non-runtime effect | Kept with explicit planned description | N/A (verified) | relabeled |
| Response Vault | Use in Chat / Speak / Favorite / Pin / Edit / Duplicate / Archive | Functional flows wired to store/runtime | Kept | N/A (verified) | functional |
| Response Vault | Generate audio | Truthful provider-unavailable messaging | Kept | N/A (verified) | disabled-truthfully |
| Network | Scan controls / tab controls / map controls | Functional; fallback states vary by runtime | Kept with explicit mode badges | N/A (verified) | functional |
| Network | Robot avatar message hint | **Misleading fixed line** could claim demo mode even in live/fallback contexts | Now runtime-aware message reflects demo/live/fallback status | `components/network/NetworkDiscoveryFeature.tsx` | relabeled |

## Totals
- Total major controls audited: **67**
- Dead/misleading controls found: **1**
- Fixed this pass: **1**
- Remaining intentionally disabled controls: attachment upload (chat), provider-audio generation when provider unavailable, unsupported platform permission rows.
