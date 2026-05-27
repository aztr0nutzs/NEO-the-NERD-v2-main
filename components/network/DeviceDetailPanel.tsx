"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  X,
  Smartphone,
  Monitor,
  Router,
  Cpu,
  Tv,
  Gamepad2,
  Printer,
  HelpCircle,
  Shield,
  Eye,
  Ban,
  Power,
  Edit3,
  StickyNote,
  Clock,
  Network,
  Wifi,
  Activity,
  AlertCircle,
  CheckCircle,
  User,
  MapPin,
  History,
  Copy,
  RefreshCw,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  DiscoveredDevice,
  DeviceIdentityUpdate,
  DeviceType,
  NetworkEvent,
  TrustLevel,
} from "@/lib/network/types";

interface DeviceDetailPanelProps {
  device: DiscoveredDevice | null;
  onClose: () => void;
  onTrust: (device: DiscoveredDevice) => void;
  onWatch: (device: DiscoveredDevice) => void;
  onBlock: (device: DiscoveredDevice) => void;
  onWake: (device: DiscoveredDevice) => void;
  onSaveNote: (device: DiscoveredDevice, note: string) => void;
  onUpdateIdentity: (device: DiscoveredDevice, patch: DeviceIdentityUpdate) => void;
  onDismiss: (device: DiscoveredDevice) => void;
  events?: NetworkEvent[];
  isDemoMode: boolean;
}

const DEVICE_ICONS: Record<DeviceType, typeof Monitor> = {
  phone: Smartphone,
  computer: Monitor,
  router: Router,
  iot: Cpu,
  tv: Tv,
  console: Gamepad2,
  printer: Printer,
  unknown: HelpCircle,
};

const TRUST_CONFIG: Record<
  TrustLevel,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  trusted: {
    label: "TRUSTED",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  new: {
    label: "NEW",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  watch: {
    label: "WATCH",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  blocked: {
    label: "BLOCKED",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};

export function DeviceDetailPanel({
  device,
  onClose,
  onTrust,
  onWatch,
  onBlock,
  onWake,
  onSaveNote,
  onUpdateIdentity,
  onDismiss,
  events = [],
  isDemoMode,
}: DeviceDetailPanelProps) {
  const [noteText, setNoteText] = useState(device?.notes || "");
  const [hasUnsavedNote, setHasUnsavedNote] = useState(false);
  const [customName, setCustomName] = useState(device?.customName || "");
  const [room, setRoom] = useState(device?.room || "");
  const [ownerLabel, setOwnerLabel] = useState(device?.ownerLabel || "");
  const [hasUnsavedIdentity, setHasUnsavedIdentity] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"block" | null>(null);

  useEffect(() => {
    setNoteText(device?.notes || "");
    setHasUnsavedNote(false);
    setCustomName(device?.customName || "");
    setRoom(device?.room || "");
    setOwnerLabel(device?.ownerLabel || "");
    setHasUnsavedIdentity(false);
  }, [device]);

  if (!device) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-gray-800 bg-black/60 p-8 text-center backdrop-blur-sm">
        <HelpCircle className="mb-3 h-12 w-12 text-gray-700" />
        <p className="font-mono text-sm text-gray-500">SELECT_DEVICE_TO_VIEW_DETAILS</p>
        <p className="mt-1 font-mono text-xs text-gray-600">
          Click a device from the list to inspect
        </p>
      </div>
    );
  }

  const DeviceIcon = DEVICE_ICONS[device.deviceType];
  const trustConfig = TRUST_CONFIG[device.trustLevel];
  const isOnline = device.status === "online";
  const deviceEvents = events
    .filter((event) => event.relatedDeviceId === device.id)
    .slice(0, 8);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleNoteChange = (value: string) => {
    setNoteText(value);
    setHasUnsavedNote(value !== device.notes);
  };

  const handleSaveIdentity = () => {
    onUpdateIdentity(device, {
      customName: customName.trim(),
      room: room.trim(),
      ownerLabel: ownerLabel.trim(),
      manuallyVerified: true,
      dismissedForNow: false,
    });
    setHasUnsavedIdentity(false);
  };

  const handleRestoreDefaultName = () => {
    onUpdateIdentity(device, {
      customName: "",
      manuallyVerified: false,
    });
    setCustomName("");
    setHasUnsavedIdentity(false);
  };

  const handleSaveNote = () => {
    onSaveNote(device, noteText);
    setHasUnsavedNote(false);
  };

  const handleBlockConfirm = () => {
    onBlock(device);
    setConfirmAction(null);
  };

  const copyText = (value: string) => {
    if (!value || value === "Unavailable") return;
    navigator.clipboard?.writeText(value).catch(() => undefined);
  };

  const classificationReasons = getClassificationReasons(device);
  const safetyFindings = getSafetyFindings(device);

  return (
    <>
      <div className="flex h-full flex-col rounded-lg border border-pink-500/30 bg-black/60 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div
              className={`
              flex h-10 w-10 items-center justify-center rounded-lg
              ${isOnline ? "bg-cyan-500/10" : "bg-gray-800/50"}
            `}
            >
              <DeviceIcon className={`h-5 w-5 ${isOnline ? "text-cyan-400" : "text-gray-500"}`} />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-pink-400">
                DEVICE_INTEL
              </h3>
              <p className="font-mono text-xs text-gray-400">{device.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* Status Row */}
            <div className="flex items-center gap-3">
              <span
                className={`
                  flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold
                  ${isOnline ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-800 text-gray-500"}
                `}
              >
                {isOnline ? (
                  <CheckCircle className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {device.status.toUpperCase()}
              </span>
              <span
                className={`
                  flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold
                  ${trustConfig.bgColor} ${trustConfig.color}
                `}
              >
                {trustConfig.label}
              </span>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                icon={Network}
                label="IP_ADDRESS"
                value={device.ipAddress}
                color="text-cyan-400"
              />
              <InfoCard
                icon={Wifi}
                label="MAC_ADDRESS"
                value={device.macAddress}
                color="text-purple-400"
              />
              <InfoCard icon={Cpu} label="VENDOR" value={device.vendor} color="text-pink-400" />
              <InfoCard
                icon={Monitor}
                label="TYPE"
                value={device.deviceType.toUpperCase()}
                color="text-emerald-400"
              />
              {device.latencyMs !== undefined && (
                <InfoCard
                  icon={Activity}
                  label="LATENCY"
                  value={`${device.latencyMs}ms`}
                  color="text-yellow-400"
                />
              )}
              {device.signalStrength !== undefined && (
                <InfoCard
                  icon={Wifi}
                  label="SIGNAL"
                  value={`${device.signalStrength}dBm`}
                  color="text-orange-400"
                />
              )}
            </div>

            <div className="space-y-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-xs text-cyan-300">USER_DEFINED_IDENTITY</p>
                {hasUnsavedIdentity && (
                  <span className="font-mono text-[10px] text-orange-400">UNSAVED</span>
                )}
              </div>
              <div className="grid gap-2">
                <LabeledInput
                  icon={Edit3}
                  label="CUSTOM_NAME"
                  value={customName}
                  placeholder={device.rawName ?? device.name}
                  onChange={(value) => {
                    setCustomName(value);
                    setHasUnsavedIdentity(
                      value !== (device.customName ?? "") ||
                        room !== (device.room ?? "") ||
                        ownerLabel !== (device.ownerLabel ?? "")
                    );
                  }}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <LabeledInput
                    icon={MapPin}
                    label="ROOM_LOCATION"
                    value={room}
                    placeholder="Unassigned"
                    onChange={(value) => {
                      setRoom(value);
                      setHasUnsavedIdentity(
                        customName !== (device.customName ?? "") ||
                          value !== (device.room ?? "") ||
                          ownerLabel !== (device.ownerLabel ?? "")
                      );
                    }}
                  />
                  <LabeledInput
                    icon={User}
                    label="OWNER_LABEL"
                    value={ownerLabel}
                    placeholder="Unassigned"
                    onChange={(value) => {
                      setOwnerLabel(value);
                      setHasUnsavedIdentity(
                        customName !== (device.customName ?? "") ||
                          room !== (device.room ?? "") ||
                          value !== (device.ownerLabel ?? "")
                      );
                    }}
                  />
                </div>
              </div>
              <p className="font-mono text-[10px] leading-relaxed text-cyan-100/75">
                Local label only. This changes how NEO shows the device; it does not rename the router entry or the device itself.
              </p>
              {hasUnsavedIdentity && (
                <Button
                  onClick={handleSaveIdentity}
                  size="sm"
                  className="w-full border border-cyan-500/50 bg-cyan-500/20 font-mono text-xs uppercase text-cyan-300 hover:bg-cyan-500/30"
                >
                  <Edit3 className="mr-2 h-3 w-3" />
                  SAVE_IDENTITY
                </Button>
              )}
              {device.customName && (
                <Button
                  onClick={handleRestoreDefaultName}
                  size="sm"
                  variant="outline"
                  className="w-full border border-gray-700 bg-gray-900/40 font-mono text-xs uppercase text-gray-300 hover:bg-gray-800"
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  RESTORE_DEFAULT_NAME
                </Button>
              )}
            </div>

            <Section title="IDENTITY" tone="cyan">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <IdentityDatum label="DISPLAY_NAME" value={device.name} />
                <IdentityDatum label="HOSTNAME" value={device.hostname === device.ipAddress ? "Unavailable" : device.hostname} />
                <IdentityDatum label="IP_ADDRESS" value={device.ipAddress} />
                <IdentityDatum label="MAC_ADDRESS" value={device.macAddress} />
                <IdentityDatum label="MANUFACTURER" value={device.vendor} />
                <IdentityDatum label="DEVICE_TYPE" value={device.deviceType} />
                <IdentityDatum label="CONFIDENCE" value={device.confidence} />
                <IdentityDatum label="DATA_SOURCE" value={device.discoverySources.join(", ") || "Unavailable"} />
                <IdentityDatum label="FIRST_SEEN" value={formatDate(device.identityFirstSeenAt ?? device.firstSeen)} />
                <IdentityDatum label="LAST_SEEN" value={formatDate(device.identityLastSeenAt ?? device.lastSeen)} />
              </div>
            </Section>

            <Section title="NETWORK_DETAILS" tone="purple">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <IdentityDatum label="GATEWAY_RELATION" value={device.deviceType === "router" || device.discoverySources.includes("gateway") ? "Gateway/router candidate" : "Estimated client link"} />
                <IdentityDatum label="SUBNET" value={device.rawIpAddress ? "Same discovered subnet" : "Unavailable"} />
                <IdentityDatum label="OPEN_PORTS" value={device.openPorts.length ? device.openPorts.join(", ") : "Unavailable"} />
                <IdentityDatum label="SERVICES" value={device.services.length ? device.services.join(" | ") : "Unavailable"} />
                <IdentityDatum label="RESPONSE_TIME" value={device.latencyMs !== undefined ? `${device.latencyMs}ms` : "Unavailable"} />
                <IdentityDatum label="SIGNAL_RSSI" value={device.signalStrength !== undefined ? `${device.signalStrength}dBm` : "Unavailable"} />
                <IdentityDatum label="CONNECTION_CONFIDENCE" value={`${device.confidence}${device.dataLimited ? " / partial data" : ""}`} />
                <IdentityDatum label="SSDP_UPNP" value={device.discoverySources.includes("ssdp") ? device.services.filter((service) => /SSDP|UPnP/i.test(service)).join(" | ") || "Detected" : "Unavailable"} />
              </div>
            </Section>

            <Section title="CLASSIFICATION" tone="lime">
              <div className="space-y-2">
                <IdentityDatum label="INFERRED_TYPE" value={device.deviceType} />
                <div className="space-y-1">
                  {classificationReasons.map((reason) => (
                    <p key={reason} className="rounded border border-gray-800 bg-black/30 px-2 py-1 font-mono text-[10px] leading-relaxed text-gray-300">
                      {reason}
                    </p>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="SAFETY_REVIEW" tone="orange">
              <div className="space-y-1">
                {safetyFindings.map((finding) => (
                  <p key={finding} className="flex items-start gap-2 rounded border border-orange-500/15 bg-orange-500/5 px-2 py-1 font-mono text-[10px] leading-relaxed text-orange-100/85">
                    <Info className="mt-0.5 h-3 w-3 shrink-0 text-orange-300" />
                    {finding}
                  </p>
                ))}
              </div>
            </Section>

            <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
              <p className="font-mono text-xs text-gray-400">RAW_DISCOVERED_IDENTITY</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <IdentityDatum label="RAW_NAME" value={device.rawName ?? device.name} />
                <IdentityDatum label="HOSTNAME" value={device.rawHostname ?? device.hostname} />
                <IdentityDatum label="RAW_IP" value={device.rawIpAddress ?? device.ipAddress} />
                <IdentityDatum label="RAW_MAC" value={device.rawMacAddress ?? device.macAddress} />
                <IdentityDatum label="RAW_VENDOR" value={device.rawVendor ?? device.vendor} />
                <IdentityDatum label="MATCH" value={`${device.identityMatchType ?? "device-id"} / ${device.identityMatchConfidence ?? "weak"}`} />
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
              <p className="font-mono text-xs text-purple-300">TRUST_AND_IDENTITY_STATE</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <IdentityDatum label="TRUST_STATE" value={device.trustedState ?? device.trustLevel} />
                <IdentityDatum label="WATCH_STATE" value={device.watchState ? "YES" : "NO"} />
                <IdentityDatum label="BLOCK_REQUEST" value={device.requestedBlockState ? "REQUESTED" : "NONE"} />
                <IdentityDatum label="VERIFIED" value={device.manuallyVerified ? "YES" : "NO"} />
                <IdentityDatum label="IDENTITY_CONF" value={device.identityConfidence ?? "weak"} />
                <IdentityDatum label="LAST_CHANGED" value={device.lastChangedAt ? formatDate(device.lastChangedAt) : "Unavailable"} />
                <div className="col-span-2">
                  <IdentityDatum
                    label="CHANGED_FIELDS"
                    value={device.lastChangedFields?.length ? device.lastChangedFields.join(", ") : "Unavailable"}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-purple-300" />
                <p className="font-mono text-xs text-gray-400">DEVICE_EVENT_HISTORY</p>
              </div>
              {deviceEvents.length === 0 ? (
                <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
                  NO_RECORDED_DEVICE_EVENTS
                </p>
              ) : (
                <div className="space-y-2">
                  {deviceEvents.map((event) => (
                    <div
                      key={event.id}
                      className="rounded border border-gray-800 bg-black/30 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-mono text-[11px] font-bold text-gray-200">
                          {event.title}
                        </p>
                        <span className="font-mono text-[9px] uppercase text-gray-500">
                          {event.severity}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-gray-600">
                        {formatDate(event.timestamp)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-mono text-xs text-gray-400">TIMELINE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-mono text-[10px] text-gray-500">FIRST_SEEN</p>
                  <p className="font-mono text-gray-300">{formatDate(device.identityFirstSeenAt ?? device.firstSeen)}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-gray-500">LAST_SEEN</p>
                  <p className="font-mono text-gray-300">{formatDate(device.identityLastSeenAt ?? device.lastSeen)}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-mono text-[10px] text-gray-500">SEEN_COUNT</p>
                  <p className="font-mono text-gray-300">{device.seenCount ?? 1}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
              <p className="font-mono text-xs text-gray-400">DISCOVERY_PROVENANCE</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-mono text-[10px] text-gray-500">CONFIDENCE</p>
                  <p className="font-mono text-gray-200">{device.confidence.toUpperCase()}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] text-gray-500">LAST_SOURCE</p>
                  <p className="font-mono text-gray-200">{device.lastScanSource.toUpperCase()}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-mono text-[10px] text-gray-500">SOURCES</p>
                  <p className="font-mono text-gray-300">{device.discoverySources.join(", ").toUpperCase()}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-mono text-[10px] text-gray-500">PARTIAL</p>
                  <p className="font-mono text-gray-300">{device.dataLimited ? "YES" : "NO"}</p>
                </div>
              </div>
            </div>

            {/* Open Ports */}
            {device.openPorts.length > 0 && (
              <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                <p className="font-mono text-xs text-gray-400">OPEN_PORTS</p>
                <div className="flex flex-wrap gap-2">
                  {device.openPorts.map((port) => (
                    <span
                      key={port}
                      className="rounded bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-400"
                    >
                      {port}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Services */}
            {device.services.length > 0 && (
              <div className="space-y-2 rounded-lg border border-gray-800 bg-gray-900/30 p-3">
                <p className="font-mono text-xs text-gray-400">SERVICES</p>
                <div className="flex flex-wrap gap-2">
                  {device.services.map((service) => (
                    <span
                      key={service}
                      className="rounded bg-purple-500/10 px-2 py-1 font-mono text-xs text-purple-400"
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-yellow-400" />
                  <span className="font-mono text-xs text-gray-400">DEVICE_NOTES</span>
                </div>
                {hasUnsavedNote && (
                  <span className="font-mono text-[10px] text-orange-400">UNSAVED</span>
                )}
              </div>
              <Textarea
                value={noteText}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Add notes about this device..."
                className="min-h-[80px] border-gray-700 bg-gray-900/50 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:border-yellow-500/50"
              />
              {hasUnsavedNote && (
                <Button
                  onClick={handleSaveNote}
                  size="sm"
                  className="w-full border border-yellow-500/50 bg-yellow-500/20 font-mono text-xs uppercase text-yellow-400 hover:bg-yellow-500/30"
                >
                  <StickyNote className="mr-2 h-3 w-3" />
                  SAVE_NOTE
                </Button>
              )}
            </div>

            {/* Demo Notice */}
            {isDemoMode && (
              <p className="rounded border border-gray-800 bg-gray-900/30 p-2 font-mono text-[10px] text-gray-500">
                {"//"} Actions below are queued in demo mode. Live local discovery uses the Android
                native plugin; real device control requires a separate control connector.
              </p>
            )}

            <div className="rounded border border-red-500/25 bg-red-500/5 p-3">
              <p className="font-mono text-xs font-bold uppercase tracking-wider text-red-300">
                ROUTER_CONTROL_WARNING
              </p>
              <p className="mt-1 font-mono text-[10px] leading-relaxed text-red-100/80">
                Block, pause, kick, reboot, and firewall changes require a connector-backed router integration. Generic discovery cannot safely control devices.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                icon={Copy}
                label="COPY IP"
                onClick={() => copyText(device.ipAddress)}
                colorClass="border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
              />
              <ActionButton
                icon={Copy}
                label="COPY MAC"
                onClick={() => copyText(device.macAddress)}
                colorClass={device.macAddress === "Unavailable" ? "border-gray-700 bg-gray-900/30 text-gray-600" : "border-purple-500/50 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"}
              />
              {device.trustLevel !== "trusted" && (
                <ActionButton
                  icon={Shield}
                  label="TRUST"
                  onClick={() => onTrust(device)}
                  colorClass="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                />
              )}
              {device.trustLevel !== "watch" && (
                <ActionButton
                  icon={Eye}
                  label="WATCH"
                  onClick={() => onWatch(device)}
                  colorClass="border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20"
                />
              )}
              {!device.requestedBlockState && (
                <ActionButton
                  icon={Ban}
                  label="REQUEST BLOCK"
                  onClick={() => setConfirmAction("block")}
                  colorClass="border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                />
              )}
              {device.trustedState === "new" && (
                <ActionButton
                  icon={X}
                  label="DISMISS"
                  onClick={() => onDismiss(device)}
                  colorClass="border-gray-600 bg-gray-900/40 text-gray-400 hover:bg-gray-800"
                />
              )}
              {device.status === "offline" &&
                (device.deviceType === "computer" || device.deviceType === "console") && (
                  <ActionButton
                    icon={Power}
                    label="WAKE"
                    onClick={() => onWake(device)}
                    colorClass="border-cyan-500/50 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20"
                  />
                )}
              <Button
                disabled
                variant="outline"
                size="sm"
                title="Per-device rescan is not implemented; run a Quick/Balanced scan from Scan."
                className="col-span-2 justify-start border border-gray-700 bg-gray-900/30 font-mono text-xs uppercase text-gray-600"
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                RESCAN_DEVICE UNAVAILABLE
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={confirmAction === "block"} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent className="border-red-500/30 bg-gray-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-red-400">
              REQUEST_DEVICE_BLOCK
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-gray-400">
              This records a requested block for {device.name} ({device.ipAddress}). This build does
              not execute real device blocking unless a connector-backed control path is added.
              {isDemoMode && (
                <span className="mt-2 block text-orange-400">
                  Demo mode does not change router firewall rules.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 font-mono text-gray-400">
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockConfirm}
              className="border-red-500/50 bg-red-500/20 font-mono text-red-400 hover:bg-red-500/30"
            >
              RECORD_REQUEST
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Monitor;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-2.5">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="font-mono text-[9px] text-gray-500">{label}</span>
      </div>
      <p className={`truncate font-mono text-xs font-bold ${color}`}>{value}</p>
    </div>
  );
}

function IdentityDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] text-gray-500">{label}</p>
      <p className="truncate font-mono text-gray-300">{value || "Unavailable"}</p>
    </div>
  );
}

function Section({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "cyan" | "purple" | "lime" | "orange";
  children: ReactNode;
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/20 bg-cyan-500/5 text-cyan-300"
      : tone === "purple"
        ? "border-purple-500/20 bg-purple-500/5 text-purple-300"
        : tone === "lime"
          ? "border-lime-500/20 bg-lime-500/5 text-lime-300"
          : "border-orange-500/20 bg-orange-500/5 text-orange-300";
  return (
    <div className={`space-y-2 rounded-lg border p-3 ${toneClass}`}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]">{title}</p>
      {children}
    </div>
  );
}

function getClassificationReasons(device: DiscoveredDevice) {
  const reasons: string[] = [];
  if (device.deviceType === "router" || device.discoverySources.includes("gateway")) {
    reasons.push("Classified as router/gateway because it matches the discovered gateway source or gateway IP.");
  }
  if (device.hostname && device.hostname !== device.ipAddress) {
    reasons.push(`Hostname contributed to identity: ${device.hostname}.`);
  }
  if (device.vendor && device.vendor !== "Unavailable") {
    reasons.push(`Vendor/manufacturer hint contributed: ${device.vendor}.`);
  }
  if (device.openPorts.length > 0) {
    reasons.push(`Open/common ports contributed: ${device.openPorts.join(", ")}.`);
  }
  if (device.discoverySources.includes("ssdp")) {
    reasons.push("SSDP/UPnP response contributed service identity.");
  }
  if (device.customName || device.manuallyVerified) {
    reasons.push("Manual/local label contributed to the display identity.");
  }
  if (reasons.length === 0 || device.deviceType === "unknown") {
    reasons.push("Type remains unknown because hostname, vendor, ports, or SSDP data were insufficient.");
  }
  reasons.push(`Confidence is ${device.confidence}; unavailable fields are shown as unavailable instead of guessed.`);
  return reasons;
}

function getSafetyFindings(device: DiscoveredDevice) {
  const findings: string[] = [];
  if (device.trustLevel === "new" || device.isNewIdentity) findings.push("New device: review whether you recognize this IP/MAC before marking trusted.");
  if (device.vendor === "Unavailable") findings.push("Unknown vendor: Android/ARP data did not provide a manufacturer.");
  if (!device.hostname || device.hostname === device.ipAddress) findings.push("No hostname: many devices hide names or block reverse lookup.");
  if (device.deviceType === "unknown") findings.push("Unknown type: classification needs more evidence.");
  if (device.dataLimited) findings.push("Partial data: at least one useful field was unavailable or blocked.");
  if (device.openPorts.some((port) => [22, 139, 445, 8080, 8443].includes(port))) {
    findings.push("Review exposed services: common management/file-sharing ports were detected.");
  }
  if (findings.length === 0) findings.push("No immediate review flag from the currently discovered data.");
  return findings;
}

function LabeledInput({
  icon: Icon,
  label,
  value,
  placeholder,
  onChange,
}: {
  icon: typeof Edit3;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
        <Icon className="h-3 w-3 text-cyan-300" />
        {label}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 border-gray-700 bg-gray-950/60 font-mono text-xs text-gray-200 placeholder:text-gray-600 focus:border-cyan-500/50"
      />
    </label>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  colorClass,
}: {
  icon: typeof Shield;
  label: string;
  onClick: () => void;
  colorClass: string;
}) {
  return (
    <Button
      onClick={onClick}
      variant="outline"
      size="sm"
      className={`justify-start border font-mono text-xs uppercase ${colorClass}`}
    >
      <Icon className="mr-2 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
