export type AvatarClipKey =
  | "idle"
  | "wakeup"
  | "thinking"
  | "happy"
  | "ecstatic"
  | "surprised"
  | "angry"
  | "shutdown"

export type AvatarPlaybackMode = "loop" | "one-shot"

export interface AvatarMediaEntry {
  key: AvatarClipKey
  src: `/media/neo/avatar/${string}.mp4`
  playback: AvatarPlaybackMode
  description: string
  state: "base" | "reaction"
  priority: number
}

export const AVATAR_MEDIA: Record<AvatarClipKey, AvatarMediaEntry> = {
  idle: {
    key: "idle",
    src: "/media/neo/avatar/idle.mp4",
    playback: "loop",
    description: "Base living idle avatar loop.",
    state: "base",
    priority: 0,
  },
  wakeup: {
    key: "wakeup",
    src: "/media/neo/avatar/wakeup.mp4",
    playback: "one-shot",
    description: "Startup wake-up reaction after boot handoff.",
    state: "reaction",
    priority: 80,
  },
  thinking: {
    key: "thinking",
    src: "/media/neo/avatar/thinking.mp4",
    playback: "one-shot",
    description: "Processing or reasoning reaction.",
    state: "reaction",
    priority: 40,
  },
  happy: {
    key: "happy",
    src: "/media/neo/avatar/happy.mp4",
    playback: "one-shot",
    description: "Positive response reaction.",
    state: "reaction",
    priority: 30,
  },
  ecstatic: {
    key: "ecstatic",
    src: "/media/neo/avatar/ecstatic.mp4",
    playback: "one-shot",
    description: "High-energy celebration reaction.",
    state: "reaction",
    priority: 50,
  },
  surprised: {
    key: "surprised",
    src: "/media/neo/avatar/surprised.mp4",
    playback: "one-shot",
    description: "Unexpected input reaction.",
    state: "reaction",
    priority: 45,
  },
  angry: {
    key: "angry",
    src: "/media/neo/avatar/angry.mp4",
    playback: "one-shot",
    description: "Intense or frustrated reaction.",
    state: "reaction",
    priority: 60,
  },
  shutdown: {
    key: "shutdown",
    src: "/media/neo/avatar/shutdown.mp4",
    playback: "one-shot",
    description: "Shutdown or offline transition reaction.",
    state: "reaction",
    priority: 90,
  },
}
