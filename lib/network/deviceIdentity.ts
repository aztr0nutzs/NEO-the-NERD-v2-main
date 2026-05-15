import type {
  DeviceIdentityConfidence,
  DeviceIdentityMatchType,
  DeviceIdentityRecord,
  DeviceIdentityUpdate,
  DiscoveredDevice,
  TrustLevel,
} from "./types";

interface CandidateIdentityKey {
  key: string;
  type: DeviceIdentityMatchType;
  confidence: DeviceIdentityConfidence;
}

interface IdentityMergeResult {
  devices: DiscoveredDevice[];
  identities: DeviceIdentityRecord[];
}

const TRUST_TO_IDENTITY: Record<TrustLevel, DeviceIdentityRecord["trustedState"]> = {
  trusted: "trusted",
  watch: "watch",
  blocked: "requested-block",
  new: "new",
};

function normalizeMac(macAddress: string) {
  const normalized = macAddress.trim().toLowerCase().replace(/[^a-f0-9]/g, "");
  if (!normalized || normalized.length !== 12 || /^0+$/.test(normalized)) return "";
  return normalized.match(/.{1,2}/g)?.join(":") ?? "";
}

function normalizeToken(value: string) {
  const next = value.trim().toLowerCase();
  if (!next || next === "unknown" || next === "unavailable" || next === "n/a") return "";
  return next;
}

export function getDeviceIdentityCandidates(device: DiscoveredDevice): CandidateIdentityKey[] {
  const candidates: CandidateIdentityKey[] = [];
  const mac = normalizeMac(device.macAddress);
  const hostname = normalizeToken(device.hostname);
  const ipAddress = normalizeToken(device.ipAddress);
  const deviceId = normalizeToken(device.id);

  if (mac) {
    candidates.push({ key: `mac:${mac}`, type: "mac", confidence: "high" });
  }

  if (ipAddress && hostname && hostname !== ipAddress) {
    candidates.push({
      key: `ip-hostname:${ipAddress}:${hostname}`,
      type: "ip-hostname",
      confidence: "medium",
    });
  }

  if (ipAddress) {
    candidates.push({ key: `ip:${ipAddress}`, type: "ip", confidence: "weak" });
  }

  if (deviceId) {
    candidates.push({ key: `device-id:${deviceId}`, type: "device-id", confidence: "weak" });
  }

  return candidates;
}

function createSnapshot(device: DiscoveredDevice, now: string): DeviceIdentityRecord["rawIdentitySnapshot"] {
  return {
    name: device.name,
    hostname: device.hostname,
    ipAddress: device.ipAddress,
    macAddress: device.macAddress,
    vendor: device.vendor,
    deviceType: device.deviceType,
    discoverySources: [...device.discoverySources],
    confidence: device.confidence,
    lastScanSource: device.lastScanSource,
    capturedAt: now,
  };
}

function createIdentity(device: DiscoveredDevice, candidates: CandidateIdentityKey[], now: string) {
  const primary = candidates[0] ?? {
    key: `device-id:${device.id}`,
    type: "device-id" as const,
    confidence: "weak" as const,
  };

  return {
    stableKey: primary.key,
    matchKeys: candidates.map((candidate) => candidate.key),
    matchKeyType: primary.type,
    rawDeviceIds: [device.id],
    customName: "",
    room: "",
    ownerLabel: "",
    trustedState: TRUST_TO_IDENTITY[device.trustLevel],
    watchState: device.trustLevel === "watch",
    requestedBlockState: device.trustLevel === "blocked",
    firstSeenAt: device.firstSeen || now,
    lastSeenAt: device.lastSeen || now,
    seenCount: 1,
    notes: device.notes || "",
    identityConfidence: primary.confidence,
    manuallyVerified: device.trustLevel === "trusted",
    dismissedForNow: false,
    lastChangedAt: now,
    lastChangedFields: ["created"],
    rawIdentitySnapshot: createSnapshot(device, now),
  } satisfies DeviceIdentityRecord;
}

function findIdentity(
  identities: DeviceIdentityRecord[],
  candidates: CandidateIdentityKey[]
): { identity: DeviceIdentityRecord; candidate: CandidateIdentityKey } | null {
  for (const candidate of candidates) {
    const identity = identities.find((record) => record.matchKeys.includes(candidate.key));
    if (identity) return { identity, candidate };
  }

  return null;
}

function mergeRecord(
  record: DeviceIdentityRecord,
  device: DiscoveredDevice,
  candidates: CandidateIdentityKey[],
  matchedCandidate: CandidateIdentityKey,
  now: string
) {
  const matchKeys = Array.from(new Set([...record.matchKeys, ...candidates.map((candidate) => candidate.key)]));
  const rawDeviceIds = Array.from(new Set([...record.rawDeviceIds, device.id]));
  const bestCandidate = candidates[0] ?? matchedCandidate;

  return {
    ...record,
    stableKey: bestCandidate.type === "mac" ? bestCandidate.key : record.stableKey,
    matchKeys,
    matchKeyType: bestCandidate.type === "mac" ? "mac" : matchedCandidate.type,
    rawDeviceIds,
    lastSeenAt: device.lastSeen || now,
    seenCount: record.seenCount + 1,
    identityConfidence: bestCandidate.type === "mac" ? "high" : record.identityConfidence,
    rawIdentitySnapshot: createSnapshot(device, now),
  } satisfies DeviceIdentityRecord;
}

function identityTrustToDeviceTrust(record: DeviceIdentityRecord): TrustLevel {
  if (record.requestedBlockState || record.trustedState === "requested-block") return "watch";
  if (record.trustedState === "trusted") return "trusted";
  if (record.trustedState === "watch" || record.watchState) return "watch";
  return "new";
}

export function applyIdentityToDevice(
  device: DiscoveredDevice,
  identity: DeviceIdentityRecord,
  candidate: CandidateIdentityKey
): DiscoveredDevice {
  const displayName = identity.customName.trim() || device.name;

  return {
    ...device,
    name: displayName,
    notes: identity.notes || device.notes,
    trustLevel: identityTrustToDeviceTrust(identity),
    identityKey: identity.stableKey,
    identityMatchType: candidate.type,
    identityMatchConfidence: candidate.confidence,
    customName: identity.customName,
    room: identity.room,
    ownerLabel: identity.ownerLabel,
    trustedState: identity.trustedState,
    watchState: identity.watchState,
    requestedBlockState: identity.requestedBlockState,
    identityFirstSeenAt: identity.firstSeenAt,
    identityLastSeenAt: identity.lastSeenAt,
    seenCount: identity.seenCount,
    identityNotes: identity.notes,
    identityConfidence: identity.identityConfidence,
    manuallyVerified: identity.manuallyVerified,
    lastChangedAt: identity.lastChangedAt,
    lastChangedFields: identity.lastChangedFields,
    rawName: identity.rawIdentitySnapshot.name,
    rawHostname: identity.rawIdentitySnapshot.hostname,
    rawIpAddress: identity.rawIdentitySnapshot.ipAddress,
    rawMacAddress: identity.rawIdentitySnapshot.macAddress,
    rawVendor: identity.rawIdentitySnapshot.vendor,
    isNewIdentity: !identity.manuallyVerified && identity.trustedState === "new" && !identity.dismissedForNow,
    dismissedForNow: identity.dismissedForNow,
  };
}

export function mergeDeviceIdentities(
  currentIdentities: DeviceIdentityRecord[],
  discoveredDevices: DiscoveredDevice[],
  now = new Date().toISOString()
): IdentityMergeResult {
  const identities = [...currentIdentities];

  const devices = discoveredDevices.map((device) => {
    const candidates = getDeviceIdentityCandidates(device);
    const match = findIdentity(identities, candidates);

    if (match) {
      const nextRecord = mergeRecord(match.identity, device, candidates, match.candidate, now);
      const index = identities.findIndex((record) => record.stableKey === match.identity.stableKey);
      identities[index] = nextRecord;
      return applyIdentityToDevice(device, nextRecord, match.candidate);
    }

    const nextRecord = createIdentity(device, candidates, now);
    identities.push(nextRecord);
    const primary = candidates[0] ?? {
      key: nextRecord.stableKey,
      type: nextRecord.matchKeyType,
      confidence: nextRecord.identityConfidence,
    };
    return applyIdentityToDevice(device, nextRecord, primary);
  });

  return { devices, identities };
}

export function updateDeviceIdentity(
  currentIdentities: DeviceIdentityRecord[],
  device: DiscoveredDevice,
  patch: DeviceIdentityUpdate,
  now = new Date().toISOString()
) {
  const candidates = getDeviceIdentityCandidates(device);
  const existing = findIdentity(currentIdentities, candidates);
  const base = existing?.identity ?? createIdentity(device, candidates, now);
  const changedFields = Object.entries(patch)
    .filter(([key, value]) => base[key as keyof DeviceIdentityUpdate] !== value)
    .map(([key]) => key);

  const nextRecord: DeviceIdentityRecord = {
    ...base,
    ...patch,
    matchKeys: Array.from(new Set([...base.matchKeys, ...candidates.map((candidate) => candidate.key)])),
    rawDeviceIds: Array.from(new Set([...base.rawDeviceIds, device.id])),
    manuallyVerified:
      patch.manuallyVerified ??
      (base.manuallyVerified ||
        Boolean(
          patch.customName ||
            patch.room ||
            patch.ownerLabel ||
            patch.notes ||
            patch.trustedState === "trusted" ||
            patch.trustedState === "watch" ||
            patch.trustedState === "requested-block"
        )),
    lastChangedAt: changedFields.length ? now : base.lastChangedAt,
    lastChangedFields: changedFields.length ? changedFields : base.lastChangedFields,
    rawIdentitySnapshot: createSnapshot(device, now),
  };

  const withoutExisting = currentIdentities.filter((record) =>
    existing ? record.stableKey !== existing.identity.stableKey : record.stableKey !== nextRecord.stableKey
  );

  return [...withoutExisting, nextRecord];
}

export function projectIdentityOntoDevices(
  identities: DeviceIdentityRecord[],
  devices: DiscoveredDevice[]
) {
  return devices.map((device) => {
    const candidates = getDeviceIdentityCandidates(device);
    const match = findIdentity(identities, candidates);
    return match ? applyIdentityToDevice(device, match.identity, match.candidate) : device;
  });
}

export function buildDeviceIdentityFacts(devices: DiscoveredDevice[]) {
  return devices.map((device) => ({
    id: device.id,
    displayName: device.name,
    rawName: device.rawName ?? device.name,
    ipAddress: device.ipAddress,
    macAddress: device.macAddress,
    vendor: device.vendor,
    trustState: device.trustedState ?? device.trustLevel,
    watchState: Boolean(device.watchState),
    requestedBlockState: Boolean(device.requestedBlockState),
    identityConfidence: device.identityConfidence ?? device.identityMatchConfidence ?? "weak",
    discoveryConfidence: device.confidence,
    discoverySources: device.discoverySources,
    firstSeenAt: device.identityFirstSeenAt ?? device.firstSeen,
    lastSeenAt: device.identityLastSeenAt ?? device.lastSeen,
    seenCount: device.seenCount ?? 1,
    room: device.room ?? "",
    ownerLabel: device.ownerLabel ?? "",
    manuallyVerified: Boolean(device.manuallyVerified),
  }));
}
