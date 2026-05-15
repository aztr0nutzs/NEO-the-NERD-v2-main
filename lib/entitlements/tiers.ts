/**
 * NEO the NERD — Feature entitlement architecture.
 *
 * Why this file exists:
 *  - We want a clean, single source of truth for what "Free" and "Plus" mean,
 *    so future monetization is a configuration change rather than a refactor.
 *  - We do NOT hard-paywall any feature that exists today. Every capability
 *    that ships in this build is part of the Free tier — entitlements only
 *    gate future / labelled-premium candidates and provide UI affordances
 *    (badges, copy) for surfacing what a future Plus plan could include.
 *  - There is no network call here. Tier resolution is purely client-side and
 *    deterministic so the app behaves the same offline.
 */

export type EntitlementTier = "free" | "plus"

export type EntitlementFeatureId =
  // ── Free core (ships today) ─────────────────────────────────────────
  | "network.scan.basic"
  | "network.export.json"
  | "network.export.csv"
  | "network.export.text"
  | "device.inventory.export"
  | "ai.summary.deterministic"
  // ── Plus-candidate features (architecture only — not paywalled yet) ─
  | "network.export.pdf"
  | "network.history.long-term"
  | "monitoring.scheduled-deep"
  | "voice-pack.premium"
  | "reports.advanced"
  | "multi-network-profiles"
  | "ai.summary.provider"

export interface EntitlementFeatureDefinition {
  id: EntitlementFeatureId
  label: string
  description: string
  /** Tier required to use this feature. */
  tier: EntitlementTier
  /**
   * When true, the feature is currently bundled into Free regardless of
   * `tier`. Used during the runway phase so labelled-Plus features are still
   * usable while the monetization rollout is staged.
   */
  freeInCurrentBuild: boolean
  /** Optional category for grouping in UI / docs. */
  category: "core" | "reports" | "monitoring" | "voice" | "ai" | "profiles"
  /** Marketing copy shown on Plus badges and upsell sheets. */
  upsellHeadline?: string
}

export const ENTITLEMENT_REGISTRY: Record<
  EntitlementFeatureId,
  EntitlementFeatureDefinition
> = {
  "network.scan.basic": {
    id: "network.scan.basic",
    label: "Network discovery scans",
    description: "Run quick, balanced, or deep scans of your local subnet.",
    tier: "free",
    freeInCurrentBuild: true,
    category: "core",
  },
  "network.export.json": {
    id: "network.export.json",
    label: "JSON report export",
    description: "Export a structured JSON report of your latest scan.",
    tier: "free",
    freeInCurrentBuild: true,
    category: "reports",
  },
  "network.export.csv": {
    id: "network.export.csv",
    label: "CSV report export",
    description: "Spreadsheet-friendly CSV bundles for devices and events.",
    tier: "free",
    freeInCurrentBuild: true,
    category: "reports",
  },
  "network.export.text": {
    id: "network.export.text",
    label: "Printable text report",
    description: "Plain-text mission report that prints and shares cleanly.",
    tier: "free",
    freeInCurrentBuild: true,
    category: "reports",
  },
  "device.inventory.export": {
    id: "device.inventory.export",
    label: "Trusted device inventory export",
    description: "Export the labels, owners, rooms, and trust state you've curated.",
    tier: "free",
    freeInCurrentBuild: true,
    category: "reports",
  },
  "ai.summary.deterministic": {
    id: "ai.summary.deterministic",
    label: "Deterministic network summary",
    description: "Locally generated summary using on-device heuristics; no provider required.",
    tier: "free",
    freeInCurrentBuild: true,
    category: "ai",
  },

  // Plus candidates — architecture only. freeInCurrentBuild keeps these
  // usable today so we don't regress the Free experience.
  "network.export.pdf": {
    id: "network.export.pdf",
    label: "PDF mission reports",
    description: "Render branded, multi-section PDF reports suitable for sharing or compliance.",
    tier: "plus",
    freeInCurrentBuild: false,
    category: "reports",
    upsellHeadline: "Polished, shareable PDF reports",
  },
  "network.history.long-term": {
    id: "network.history.long-term",
    label: "Long-term history",
    description: "Keep more than 30 scans and snapshots on-device for trend analysis.",
    tier: "plus",
    freeInCurrentBuild: true,
    category: "monitoring",
    upsellHeadline: "Months of history at your fingertips",
  },
  "monitoring.scheduled-deep": {
    id: "monitoring.scheduled-deep",
    label: "Scheduled deep monitoring",
    description: "Run deep scans on a custom cadence with adaptive intervals.",
    tier: "plus",
    freeInCurrentBuild: true,
    category: "monitoring",
    upsellHeadline: "Always-on deep network watch",
  },
  "voice-pack.premium": {
    id: "voice-pack.premium",
    label: "Premium voice packs",
    description: "Cinematic, neural, and signature voice packs beyond the bundled set.",
    tier: "plus",
    freeInCurrentBuild: true,
    category: "voice",
    upsellHeadline: "Cinematic neural voices",
  },
  "reports.advanced": {
    id: "reports.advanced",
    label: "Advanced reports",
    description: "Cross-scan diffs, identity timelines, and per-device health drill-downs.",
    tier: "plus",
    freeInCurrentBuild: true,
    category: "reports",
    upsellHeadline: "Drill-down analytics across every scan",
  },
  "multi-network-profiles": {
    id: "multi-network-profiles",
    label: "Multi-network profiles",
    description: "Save settings, baselines, and identity sets per Wi-Fi (home, office, café).",
    tier: "plus",
    freeInCurrentBuild: true,
    category: "profiles",
    upsellHeadline: "One NEO, every network you visit",
  },
  "ai.summary.provider": {
    id: "ai.summary.provider",
    label: "AI-written executive summary",
    description: "Use the configured Claude provider to author a polished, human-readable summary of your network.",
    tier: "plus",
    freeInCurrentBuild: true,
    category: "ai",
    upsellHeadline: "AI-written executive summary",
  },
}

export interface EntitlementState {
  /** Currently active tier for this device. Stored in app settings. */
  tier: EntitlementTier
  /** ISO timestamp the tier became active; used for "since" UI copy. */
  activatedAt: string | null
  /** Free-form display name shown in the UI ("Free", "Plus" or partner labels). */
  planLabel: string
}

export const DEFAULT_ENTITLEMENT_STATE: EntitlementState = {
  tier: "free",
  activatedAt: null,
  planLabel: "Free",
}

/**
 * Returns true when the device can use a feature today.
 *
 * Soft-paywall philosophy: a feature is granted if EITHER
 *  (a) the user's tier meets the feature requirement, OR
 *  (b) `freeInCurrentBuild` is true — i.e. we're in the runway phase
 *      and the labelled-Plus feature is still bundled into Free.
 *
 * This keeps the UI honest (we can show "Plus" badges) without ever
 * blocking a user from a feature that is currently shipping.
 */
export function canUseFeature(
  state: EntitlementState | undefined,
  featureId: EntitlementFeatureId,
): boolean {
  const definition = ENTITLEMENT_REGISTRY[featureId]
  if (!definition) return false
  if (definition.freeInCurrentBuild) return true
  if (definition.tier === "free") return true
  return state?.tier === "plus"
}

export function getFeatureDefinition(
  featureId: EntitlementFeatureId,
): EntitlementFeatureDefinition {
  return ENTITLEMENT_REGISTRY[featureId]
}

export function listPlusCandidates(): EntitlementFeatureDefinition[] {
  return Object.values(ENTITLEMENT_REGISTRY).filter(
    (def) => def.tier === "plus",
  )
}

export function listFreeCoreFeatures(): EntitlementFeatureDefinition[] {
  return Object.values(ENTITLEMENT_REGISTRY).filter(
    (def) => def.tier === "free",
  )
}
