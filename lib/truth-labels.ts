export const TRUTH_LABELS = [
  "LIVE",
  "LOCAL",
  "PROVIDER ACTIVE",
  "PROVIDER REQUIRED",
  "CONNECTOR REQUIRED",
  "READ ONLY",
  "ESTIMATED",
  "PARTIAL",
  "NOT CONFIGURED",
  "UNAVAILABLE",
  "DEMO",
  "FALLBACK",
  "FOREGROUND ONLY",
  "COMING SOON",
] as const

export type TruthLabel = (typeof TRUTH_LABELS)[number]

export const TRUTH_LABEL_COLORS: Record<TruthLabel, string> = {
  LIVE: "#39ff14",
  LOCAL: "#00f0ff",
  "PROVIDER ACTIVE": "#39ff14",
  "PROVIDER REQUIRED": "#ff7a00",
  "CONNECTOR REQUIRED": "#ff7a00",
  "READ ONLY": "#9ad7ff",
  ESTIMATED: "#ffd000",
  PARTIAL: "#ffd000",
  "NOT CONFIGURED": "#ff7a00",
  UNAVAILABLE: "#ff2d9c",
  DEMO: "#ff7a00",
  FALLBACK: "#ff7a00",
  "FOREGROUND ONLY": "#b829ff",
  "COMING SOON": "#9ad7ff",
}

export function truthLabelColor(label: TruthLabel) {
  return TRUTH_LABEL_COLORS[label]
}
