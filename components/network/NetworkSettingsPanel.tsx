"use client";

import {
  Settings,
  Zap,
  Scale,
  Search,
  Clock,
  Bell,
  Shield,
  Gauge,
  AlertTriangle,
  FlaskConical,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NetworkAdapterStatus, NetworkSettings, ScanMode } from "@/lib/network/types";
import type { NetworkMonitorState } from "@/lib/network/types";

interface NetworkSettingsPanelProps {
  settings: NetworkSettings;
  onUpdateSettings: (settings: Partial<NetworkSettings>) => void;
  adapterStatus?: NetworkAdapterStatus | null;
  monitorState?: NetworkMonitorState;
}

const SCAN_MODES: { value: ScanMode; label: string; icon: typeof Zap; description: string }[] = [
  { value: "quick", label: "QUICK", icon: Zap, description: "Context + gateway probe + shallow bounded host probe" },
  { value: "balanced", label: "BALANCED", icon: Scale, description: "Quick + ARP/MAC + hostname + SSDP + bounded ports" },
  { value: "deep", label: "DEEP", icon: Search, description: "Balanced + larger host cap, longer timeout, expanded bounded ports" },
];

const INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
  { value: 360, label: "6 hours" },
];

export function NetworkSettingsPanel({
  settings,
  onUpdateSettings,
  adapterStatus,
  monitorState,
}: NetworkSettingsPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-500/30 bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-400" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-gray-400">
            NETWORK_SETTINGS
          </h3>
        </div>
      </div>

      {/* Settings List */}
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {/* Demo Mode Warning */}
          {settings.demoMode && (
            <div className="flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <div>
                <p className="font-mono text-xs font-bold text-orange-400">DEMO_MODE_ACTIVE</p>
                <p className="mt-0.5 font-mono text-[10px] text-orange-300/80">
                  Browser preview mode: simulated network data. Install/run the Android app for live local LAN discovery.
                  Installed Android local discovery does not require a backend.
                </p>
              </div>
            </div>
          )}

          {!settings.demoMode && adapterStatus?.mode === "native-unavailable" && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
              <div>
                <p className="font-mono text-xs font-bold text-yellow-400">NATIVE_DISCOVERY_UNAVAILABLE</p>
                <p className="mt-0.5 font-mono text-[10px] text-yellow-300/80">
                  Native Android discovery failed to initialize. No backend is required for local LAN scanning —
                  retry live discovery from the Scan tab, or enable Demo Preview to use labeled simulated data.
                </p>
              </div>
            </div>
          )}

          {/* Scan Mode */}
          <SettingGroup title="SCAN_CONFIGURATION" icon={Gauge}>
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block font-mono text-xs text-gray-400">
                  DEFAULT_SCAN_MODE
                </Label>
                <Select
                  value={settings.scanMode}
                  onValueChange={(value) => onUpdateSettings({ scanMode: value as ScanMode })}
                >
                  <SelectTrigger className="border-gray-700 bg-gray-900/50 font-mono text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-gray-700 bg-gray-900">
                    {SCAN_MODES.map(({ value, label, icon: Icon, description }) => (
                      <SelectItem key={value} value={value} className="font-mono">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-cyan-400" />
                          <span>{label}</span>
                          <span className="text-gray-500">- {description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SettingGroup>

          {/* Auto Scan */}
          <SettingGroup title="AUTO_SCAN · FOREGROUND ONLY" icon={Clock}>
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded border border-orange-500/30 bg-orange-500/5 p-2.5">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-300" />
                <p className="font-mono text-[10px] leading-relaxed text-orange-300">
                  <span className="font-bold uppercase tracking-[0.18em]">FOREGROUND ONLY</span> ·
                  Recurring network scans run only while N.E.O. is open and the Network module is
                  active. Closed-app background scans are not enabled in this build.
                </p>
              </div>
              <SettingToggle
                label="ENABLE_AUTO_SCAN"
                description="Foreground-only: in-app scheduler runs while N.E.O. is open; persists next run across app restarts but does not scan when the app is closed."
                checked={settings.autoScanEnabled}
                onCheckedChange={(checked) => onUpdateSettings({ autoScanEnabled: checked })}
              />

              {settings.autoScanEnabled && (
                <div>
                  <Label className="mb-2 block font-mono text-xs text-gray-400">SCAN_INTERVAL</Label>
                  <Select
                    value={settings.autoScanIntervalMinutes.toString()}
                    onValueChange={(value) =>
                      onUpdateSettings({ autoScanIntervalMinutes: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="border-gray-700 bg-gray-900/50 font-mono text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-gray-700 bg-gray-900">
                      {INTERVAL_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value.toString()} className="font-mono">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 font-mono text-[10px] text-gray-500">
                    Next run: {monitorState?.nextRunAt ? new Date(monitorState.nextRunAt).toLocaleString() : "pending scheduler update"}.
                    Interval only elapses while N.E.O. is open — closed-app WorkManager scans are not
                    active in this build.
                  </p>
                </div>
              )}
            </div>
          </SettingGroup>

          {/* Notifications */}
          <SettingGroup title="NOTIFICATIONS · FOREGROUND ONLY" icon={Bell}>
            <div className="space-y-3">
              <p className="font-mono text-[10px] leading-relaxed text-orange-300/90">
                <span className="font-bold uppercase tracking-[0.18em]">FOREGROUND ONLY</span> ·
                Alerts fire only when a scan executes while N.E.O. is open. This is not persistent
                background surveillance.
              </p>
              <SettingToggle
                label="NEW_DEVICE_ALERTS"
                description="Foreground-only: in-app alert center plus a local notification when platform permission is available. No closed-app monitoring."
                checked={settings.notifyNewDevices}
                onCheckedChange={(checked) => onUpdateSettings({ notifyNewDevices: checked })}
              />
              <SettingToggle
                label="OFFLINE_DEVICE_ALERTS"
                description="Foreground-only for trusted devices: alert center plus local notification when available. Closed-app surveillance is not active."
                checked={settings.notifyOfflineDevices}
                onCheckedChange={(checked) => onUpdateSettings({ notifyOfflineDevices: checked })}
              />
              <p className="font-mono text-[10px] text-gray-500">
                Notification path: {monitorState?.notificationCapability ?? "checking"}. If unavailable,
                alerts remain visible in-app.
              </p>
            </div>
          </SettingGroup>

          {/* Safety */}
          <SettingGroup title="SAFETY_CONTROLS" icon={Shield}>
            <div className="space-y-3">
              <SettingToggle
                label="SAFE_MODE"
                description="Active: suppresses destructive block/wake/router actions unless explicit controls are enabled"
                checked={settings.safeMode}
                onCheckedChange={(checked) => onUpdateSettings({ safeMode: checked })}
              />
              <SettingToggle
                label="ALLOW_CONTROL_ACTIONS"
                description="Active: disabled blocks control actions and leaves discovery read-only"
                checked={settings.allowControlActions}
                onCheckedChange={(checked) => onUpdateSettings({ allowControlActions: checked })}
              />
            </div>
          </SettingGroup>

          {/* Demo Mode */}
          <SettingGroup title="ADAPTER_MODE" icon={FlaskConical}>
            <div className="space-y-3">
              <SettingToggle
                label="DEMO_MODE"
                description="Use simulated network data"
                checked={settings.demoMode}
                onCheckedChange={(checked) => onUpdateSettings({ demoMode: checked })}
                highlight={settings.demoMode}
              />
              <p className="font-mono text-[10px] text-gray-500">
                {"//"} Browser preview uses simulated data. Installed Android uses the NeoNetwork
                native plugin for live local discovery; optional backend services are unrelated to
                basic LAN scanning.
              </p>
            </div>
          </SettingGroup>
        </div>
      </ScrollArea>
    </div>
  );
}

function SettingGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Settings;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-gray-400">
          {title}
        </h4>
      </div>
      {children}
    </div>
  );
}

function SettingToggle({
  label,
  description,
  checked,
  onCheckedChange,
  highlight,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`
        flex items-center justify-between rounded-lg p-2
        ${highlight ? "bg-orange-500/5" : ""}
      `}
    >
      <div className="flex-1">
        <p
          className={`font-mono text-sm ${
            highlight ? "text-orange-400" : checked ? "text-gray-200" : "text-gray-400"
          }`}
        >
          {label}
        </p>
        <p className="font-mono text-[10px] text-gray-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className={`${highlight ? "data-[state=checked]:bg-orange-500" : "data-[state=checked]:bg-cyan-500"}`}
      />
    </div>
  );
}
