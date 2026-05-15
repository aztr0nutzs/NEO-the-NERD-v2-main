"use client";

import { useEffect, useState } from "react";
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
import type { DiscoveredDevice, DeviceIdentityUpdate, DeviceType, TrustLevel } from "@/lib/network/types";

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

  const handleSaveNote = () => {
    onSaveNote(device, noteText);
    setHasUnsavedNote(false);
  };

  const handleBlockConfirm = () => {
    onBlock(device);
    setConfirmAction(null);
  };

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
            </div>

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
                  <p className="font-mono text-[10px] text-gray-500">DATA_LIMITED</p>
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
                {"//"} Actions below are queued in demo mode. Connect native backend for real device
                control.
              </p>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
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
