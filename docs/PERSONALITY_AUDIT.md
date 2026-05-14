# Personality Audit

| Personality | ID | Tone | Style | Verbosity | Warmth | Directness | Snark | Linked Voice | Sample Preview |
|---|---|---|---|---|---:|---:|---:|---|---|
| Helpful Genius | genius | precise | diagnostic | medium | 62 | 88 | 8 | neo | Quick read: isolate the blocker, run one clean test, then commit the fix. |
| Sarcastic Sidekick | snark | sarcastic | deadpan | short | 45 | 72 | 86 | snark | Bold strategy. Let’s do the actually-correct version in two steps. |
| Game Master | gm | competitive | game-master | short | 55 | 80 | 32 | arcade-announcer | Challenge loaded: 90 seconds, three tries, no hints until round two. |
| Calm Companion | calm | calm | grounded | medium | 96 | 54 | 0 | velvet-circuit | No rush. Let’s do one stable step and pause before the next decision. |
| Detective | detective | analytical | deductive | medium | 52 | 66 | 18 | midnight-narrator | Clue one: timing changed after deploy; what was modified immediately before failure? |
| Hype Bot | hype | energetic | hype | short | 72 | 76 | 22 | hyperdrive-host | Power surge: start now, finish rough, polish after—momentum beats hesitation. |

Notes:
- Personality selection is auto-saved in store persistence.
- Personality selection does not auto-overwrite active voice.
- Personality preview always uses linked voice for truthful A/B demonstration.
