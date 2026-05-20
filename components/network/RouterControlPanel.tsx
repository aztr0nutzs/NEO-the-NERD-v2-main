"use client";

import { useState } from "react";
import {
  Router,
  RefreshCcw,
  Shield,
  Server,
  Globe,
  Clock,
  Lock,
  AlertTriangle,
  Power,
  Users,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import type { RouterStatus } from "@/lib/network/types";
import type { RouterCapability, RouterControlMode } from "@/lib/network/types";

interface RouterControlPanelProps {
  routerStatus: RouterStatus;
  onRefresh: () => void;
  onToggleGuest: (enable: boolean) => void;
  onToggleQoS: (enable: boolean) => void;
  onReboot: () => void;
  isDemoMode: boolean;
  routerCapabilities: RouterCapability[];
  routerControlMode: RouterControlMode;
}

export function RouterControlPanel({
  routerStatus,
  onRefresh,
  onToggleGuest,
  onToggleQoS,
  onReboot,
  isDemoMode,
  routerCapabilities,
  routerControlMode,
}: RouterControlPanelProps) {
  const [confirmReboot, setConfirmReboot] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleRebootConfirm = () => {
    onReboot();
    setConfirmReboot(false);
  };

  const isConnected = routerStatus.connectionStatus === "connected";
  const capabilityByKey = new Map(routerCapabilities.map((capability) => [capability.key, capability]));
  const guestCapability = capabilityByKey.get("toggle-guest");
  const qosCapability = capabilityByKey.get("toggle-qos");
  const rebootCapability = capabilityByKey.get("reboot");
  const canToggleGuest = !routerStatus.readOnlyMode && guestCapability?.status === "available";
  const canToggleQos = !routerStatus.readOnlyMode && qosCapability?.status === "available";
  const canReboot = !routerStatus.readOnlyMode && rebootCapability?.status === "available";
  // Truth-driven mode. The panel is a *control* surface only when the runtime
  // can actually execute control actions — anything else is status-only.
  const isControlMode = routerControlMode === "connector-backed" && !routerStatus.readOnlyMode;
  const isDemoControl = routerControlMode === "demo";
  const titleText = isControlMode ? "ROUTER_CONTROL" : "ROUTER_STATUS";
  const subtitleText = isControlMode
    ? null
    : routerStatus.readOnlyMode
      ? "READ ONLY · CONNECTOR REQUIRED FOR CONTROL"
      : isDemoControl
        ? "DEMO ADAPTER · SIMULATED CONTROL"
        : null;
  const titleColor = isControlMode ? "text-emerald-400" : "text-cyan-300";
  const borderColor = isControlMode ? "border-emerald-500/30" : "border-cyan-500/30";
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <>
      <div className={`space-y-4 rounded-lg border ${borderColor} bg-black/60 p-4 backdrop-blur-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Router className={`h-5 w-5 ${titleColor}`} />
              <h3 className={`font-mono text-sm font-bold uppercase tracking-wider ${titleColor}`}>
                {titleText}
              </h3>
            </div>
            {subtitleText && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-orange-300/90">
                {subtitleText}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
              MODE: {routerControlMode.toUpperCase()}
            </span>
            {routerStatus.readOnlyMode && (
              <span className="flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] text-orange-400">
                <Lock className="h-3 w-3" />
                READ_ONLY
              </span>
            )}
            <span
              className={`
                flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold
                ${
                  isConnected
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }
              `}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              {routerStatus.connectionStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Router Info Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <InfoTile
            icon={Router}
            label="MODEL"
            value={routerStatus.model}
            color="text-emerald-400"
          />
          <InfoTile
            icon={Server}
            label="GATEWAY"
            value={routerStatus.gatewayIp}
            color="text-cyan-400"
          />
          <InfoTile
            icon={Globe}
            label="WAN_IP"
            value={routerStatus.wanIp}
            color="text-purple-400"
          />
          <InfoTile
            icon={Clock}
            label="UPTIME"
            value={routerStatus.uptime}
            color="text-pink-400"
            fullWidth
          />
          <InfoTile
            icon={Shield}
            label="FIRMWARE"
            value={routerStatus.firmwareVersion}
            color="text-yellow-400"
            fullWidth
          />
        </div>

        {/* DNS Servers */}
        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          <p className="mb-2 font-mono text-xs text-gray-400">DNS_SERVERS</p>
          <div className="flex flex-wrap gap-2">
            {routerStatus.dnsServers.map((dns) => (
              <span
                key={dns}
                className="rounded bg-cyan-500/10 px-2 py-1 font-mono text-xs text-cyan-400"
              >
                {dns}
              </span>
            ))}
          </div>
        </div>

        {/* Status / Toggles — only writable when isControlMode is true */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatusCard
            icon={Shield}
            label="FIREWALL"
            enabled={routerStatus.firewallEnabled}
            color="text-emerald-400"
            readOnly
          />
          <StatusCard
            icon={Users}
            label="GUEST_NETWORK"
            enabled={routerStatus.guestNetworkEnabled}
            color="text-purple-400"
            onToggle={isControlMode && canToggleGuest ? onToggleGuest : undefined}
            readOnly={!isControlMode || !canToggleGuest}
          />
          <StatusCard
            icon={Gauge}
            label="QOS"
            enabled={routerStatus.qosEnabled}
            color="text-pink-400"
            onToggle={isControlMode && canToggleQos ? onToggleQoS : undefined}
            readOnly={!isControlMode || !canToggleQos}
          />
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-3">
          <p className="mb-2 font-mono text-xs text-gray-400">CAPABILITIES</p>
          <div className="space-y-2">
            {routerCapabilities.map((capability) => (
              <div key={capability.key} className="flex items-center justify-between rounded border border-gray-800 px-2 py-1">
                <span className="font-mono text-[10px] text-gray-300">{capability.label}</span>
                <span className="font-mono text-[10px] text-orange-300">
                  {capability.status.toUpperCase()}
                  {capability.reason ? ` · ${capability.reason}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Refresh is always available — it only re-reads status. Reboot/guest/QoS
            live under an explicit advanced block when control is not wired. */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="flex-1 border-cyan-500/50 bg-cyan-500/10 font-mono text-xs uppercase text-cyan-400 hover:bg-cyan-500/20 sm:flex-none"
          >
            <RefreshCcw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            REFRESH STATUS
          </Button>

          {isControlMode && routerStatus.rebootAvailable && canReboot && (
            <Button
              onClick={() => setConfirmReboot(true)}
              variant="outline"
              size="sm"
              className="flex-1 border-red-500/50 bg-red-500/10 font-mono text-xs uppercase text-red-400 hover:bg-red-500/20 sm:flex-none"
            >
              <Power className="mr-2 h-3.5 w-3.5" />
              REBOOT
            </Button>
          )}
        </div>

        {!isControlMode && (
          <div className="space-y-2">
            <div className="flex items-start gap-2 rounded border border-orange-500/30 bg-orange-500/5 p-3 font-mono text-[10px] text-orange-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-[0.18em] text-orange-400">
                  ROUTER CONTROL REQUIRES CONNECTOR
                </p>
                <p>
                  Local LAN discovery and status reads are live in this runtime. Reboot, guest
                  Wi-Fi, and QoS execute only when a vendor/connector backend is configured —
                  none ships in the current build.
                </p>
                {isDemoMode && (
                  <p className="text-orange-300/80">
                    DEMO ADAPTER: any control attempt below is simulated only.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAdvancedOpen((current) => !current)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between rounded border border-gray-700 bg-gray-900/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-300 hover:bg-gray-900/70"
            >
              <span>ADVANCED ROUTER CONTROLS · CONNECTOR REQUIRED</span>
              <span className="text-gray-500">{advancedOpen ? "HIDE" : "SHOW"}</span>
            </button>
            {advancedOpen && (
              <div className="space-y-2 rounded border border-gray-800 bg-gray-900/30 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
                  Disabled in this runtime. These actions execute only with a connector-backed
                  adapter; the current native/demo adapter returns{" "}
                  <span className="text-orange-300">requires-connector</span>.
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <DisabledControl icon={Power} label="REBOOT" />
                  <DisabledControl icon={Users} label="GUEST_NETWORK" />
                  <DisabledControl icon={Gauge} label="QOS" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reboot Confirmation Dialog */}
      <AlertDialog open={confirmReboot} onOpenChange={setConfirmReboot}>
        <AlertDialogContent className="border-red-500/30 bg-gray-950">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-red-400">
              CONFIRM_ROUTER_REBOOT
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-gray-400">
              This will reboot your router. All connected devices will temporarily lose network
              access. The router may take 1-3 minutes to restart.
              {isDemoMode && (
                <span className="mt-2 block text-orange-400">
                  Demo mode: Reboot action will be simulated.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 font-mono text-gray-400">
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRebootConfirm}
              className="border-red-500/50 bg-red-500/20 font-mono text-red-400 hover:bg-red-500/30"
            >
              REBOOT_NOW
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function DisabledControl({ icon: Icon, label }: { icon: typeof Power; label: string }) {
  return (
    <div className="flex items-center justify-between rounded border border-gray-800 bg-black/40 px-2 py-1.5 opacity-60">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-gray-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-400">
          {label}
        </span>
      </div>
      <span className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-orange-300/80">
        REQUIRES_CONNECTOR
      </span>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  color,
  fullWidth,
}: {
  icon: typeof Router;
  label: string;
  value: string;
  color: string;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-gray-800 bg-gray-900/30 p-2.5 ${
        fullWidth ? "col-span-2 sm:col-span-1" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="font-mono text-[9px] text-gray-500">{label}</span>
      </div>
      <p className={`truncate font-mono text-xs font-bold ${color}`}>{value}</p>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  enabled,
  color,
  onToggle,
  readOnly,
}: {
  icon: typeof Shield;
  label: string;
  enabled: boolean;
  color: string;
  onToggle?: (enabled: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/30 p-3">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="font-mono text-xs text-gray-400">{label}</span>
      </div>
      {onToggle && !readOnly ? (
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          className="data-[state=checked]:bg-emerald-500"
        />
      ) : (
        <span
          className={`
            rounded px-2 py-0.5 font-mono text-[10px] font-bold
            ${enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-800 text-gray-500"}
          `}
        >
          {enabled ? "ON" : "OFF"}
        </span>
      )}
    </div>
  );
}
