# Phase 5 — Games + Knxt 4 Completeness/Fidelity Pass

**Captured:** 2026-05-27

This pass stabilizes the Games hub truth surface and Knxt 4 mode framing. It preserves the NEO cyber-arcade styling and does not add new games, fake multiplayer, fake ladder progression, fake skins, or daily Knxt 4 content.

## Registry Audit

All registered games in `lib/data.ts` route from `components/screens/games-screen.tsx`.

| ID | Title | Component path | Status | Notes |
| --- | --- | --- | --- | --- |
| `tictactoe` | Tic Tac Toe | `components/games/tic-tac-toe.tsx` | PLAYABLE / LOCAL ONLY | Has input, exit, reset/new match, difficulty-backed AI, progression once per match. |
| `rps` | Rock Paper Scissors | `components/games/rock-paper-scissors.tsx` | PLAYABLE / LOCAL ONLY | Has input, exit, new match, difficulty-backed bot behavior, progression once per match. |
| `memory` | Memory Match | `components/games/memory-match.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell for exit/replay/progression. |
| `reaction` | Reaction Tap | `components/games/reaction-tap.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell; difficulty affects timing. |
| `guess` | Guess the Number | `components/games/guess-number.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell; difficulty affects attempts/range. |
| `trivia` | Trivia Duel | `components/games/trivia-duel.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell and timer behavior. |
| `scramble` | Word Scramble | `components/games/word-scramble.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell and input/hint flow. |
| `emoji` | Emoji Decode | `components/games/emoji-decode.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell and timed decode flow. |
| `rapidfire` | Rapid Fire Questions | `components/games/rapid-fire.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Uses shared shell and timed answer flow. |
| `wyr` | Would You Rather | `components/games/would-you-rather.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Party prompt flow; no score claim on card. |
| `codebreaker` | Neon Codebreaker | `components/games/neon-codebreaker.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Logic puzzle flow, score/progression through shell. |
| `signal` | Signal Sequence | `components/games/signal-sequence.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Memory sequence flow, progression through shell. |
| `firewall` | Firewall Breach | `components/games/firewall-breach.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Grid route puzzle, progression through shell. |
| `heist` | Cyber Heist | `components/games/cyber-heist.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Branching local scenario, progression through shell. |
| `dodge` | Drone Dodge | `components/games/drone-dodge.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Reflex lane game, progression through shell. |
| `circuit` | Circuit Builder | `components/games/circuit-builder.tsx` via `ArcadeGame` | PLAYABLE / LOCAL ONLY | Tile route puzzle, timer/progression through shell. |
| `knxt4` | Knxt 4 | `components/games/knxt4/knxt4-game.tsx` | PLAYABLE / LOCAL ONLY | Classic, Quick, and Timed launch. Future Knxt systems are staged. |

## Knxt 4 Mode Classification

| Visible surface | Classification | Phase 5 handling |
| --- | --- | --- |
| Classic | playable | Launches local N.E.O. AI match with power-ups. |
| Quick | playable | Launches local N.E.O. AI match without power-ups. |
| Timed | playable | Launches 20s-per-turn local N.E.O. AI match. |
| Challenge | coming soon | Routes to a staged screen; no live puzzle-bank claim. |
| Training | coming soon | Routes to a staged screen; no lesson-mode claim. |
| Ladder | coming soon | Hub no longer exposes live ladder engagement. |
| Daily Puzzle | coming soon / not exposed as Knxt 4 live | No live daily Knxt 4 puzzle claim is shown. |
| Token Skins / Garage | coming soon | Garage route is staged; no unlockable skin system is claimed live. |

## Knxt 4 Action Classification

| Action | Classification | Notes |
| --- | --- | --- |
| Exit | playable | Hub close and in-match back/forfeit controls exist. |
| Reset / replay | playable | In-match reset/restart exists. |
| Token drop | playable | Board accepts player drops and AI replies. |
| Bomb | playable | Visible when unlocked; selects/removes enemy token and restacks column. |
| Peek | playable | Visible when unlocked; reveals threat/next-column hint. |
| Double | playable | Visible when unlocked; arms a second player drop. |
| Shift | coming soon / hidden | Definition remains in source, but it is not surfaced unless actually unlocked. |
| Gravity | coming soon / hidden | Definition remains in source, but it is not surfaced unless actually unlocked. |

## Changes Applied

- Game cards now show `PLAYABLE`, `COMING SOON`, `PARTIAL`, or `PREVIEW` status instead of generic `LIVE`.
- Playable game cards default to `LOCAL ONLY`.
- Games hub launch paths now guard against non-playable IDs.
- Recommendation badge copy was changed from an intelligence-like label to `LOCAL PICK`.
- Knxt 4 card copy now claims only Classic, Quick, and Timed as playable.
- Knxt 4 ladder engagement was removed from the hub and reframed as `COMING SOON`.
- Knxt 4 `SHIFT` and `GRAVITY` are not shown in the live power tray unless unlocked by a future real system.

## Visual Fidelity Notes

The current Knxt 4 implementation is a live React/CSS reactor-board port with animated tokens, NEO avatar video, neon HUD chrome, and responsive app-viewport overrides. It is not a screenshot replacement. Public Knxt 4 image assets exist under `public/knxt4`, but exact restoration beyond this integrated port would require the original source package/assets if they differ from the current repo.

## Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
