"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Smartphone,
  Monitor,
  Router,
  Cpu,
  Tv,
  Gamepad2,
  Printer,
  HelpCircle,
  Wifi,
  WifiOff,
  Shield,
  Eye,
  Ban,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiscoveredDevice, DeviceType, TrustLevel } from "@/lib/network/types";

interface DeviceListPanelProps {
  devices: DiscoveredDevice[];
  selectedDeviceId: string | null;
  onSelectDevice: (device: DiscoveredDevice) => void;
  onVisibleDeviceIdsChange?: (deviceIds: string[]) => void;
}

type FilterType = "all" | "online" | "new" | "trusted" | "watch" | "blocked" | "unknown";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "ALL" },
  { key: "online", label: "ONLINE" },
  { key: "new", label: "NEW" },
  { key: "trusted", label: "TRUSTED" },
  { key: "watch", label: "WATCH" },
  { key: "blocked", label: "BLOCKED" },
  { key: "unknown", label: "UNKNOWN" },
];

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
  { icon: typeof Shield; color: string; bgColor: string; borderColor: string }
> = {
  trusted: {
    icon: Shield,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
  },
  new: {
    icon: AlertCircle,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  watch: {
    icon: Eye,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
  },
  blocked: {
    icon: Ban,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};

export function DeviceListPanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onVisibleDeviceIdsChange,
}: DeviceListPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.ipAddress.includes(searchQuery) ||
        device.macAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        device.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (device.room ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (device.ownerLabel ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      let matchesFilter = true;
      switch (activeFilter) {
        case "online":
          matchesFilter = device.status === "online";
          break;
        case "new":
          matchesFilter = device.trustLevel === "new";
          break;
        case "trusted":
          matchesFilter = device.trustLevel === "trusted";
          break;
        case "watch":
          matchesFilter = device.trustLevel === "watch";
          break;
        case "blocked":
          matchesFilter = device.trustLevel === "blocked";
          break;
        case "unknown":
          matchesFilter = device.deviceType === "unknown";
          break;
      }

      return matchesSearch && matchesFilter;
    });
  }, [devices, searchQuery, activeFilter]);

  useEffect(() => {
    onVisibleDeviceIdsChange?.(filteredDevices.map((device) => device.id));
  }, [filteredDevices, onVisibleDeviceIdsChange]);

  const getFilterCount = (filter: FilterType): number => {
    switch (filter) {
      case "all":
        return devices.length;
      case "online":
        return devices.filter((d) => d.status === "online").length;
      case "new":
        return devices.filter((d) => d.trustLevel === "new").length;
      case "trusted":
        return devices.filter((d) => d.trustLevel === "trusted").length;
      case "watch":
        return devices.filter((d) => d.trustLevel === "watch").length;
      case "blocked":
        return devices.filter((d) => d.trustLevel === "blocked").length;
      case "unknown":
        return devices.filter((d) => d.deviceType === "unknown").length;
      default:
        return 0;
    }
  };

  return (
    <div className="flex h-full flex-col space-y-4 rounded-lg border border-purple-500/30 bg-black/60 p-4 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Monitor className="h-5 w-5 text-purple-400" />
        <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-purple-400">
          DEVICE_INTEL
        </h3>
        <span className="ml-auto font-mono text-xs text-gray-500">
          {filteredDevices.length} / {devices.length}
        </span>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <Input
          type="text"
          placeholder="Search devices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-gray-700 bg-gray-900/50 pl-10 font-mono text-sm text-gray-200 placeholder:text-gray-600 focus:border-purple-500/50 focus:ring-purple-500/20"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => {
          const count = getFilterCount(key);
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`
                flex items-center gap-1.5 rounded-full border px-3 py-1
                font-mono text-[10px] font-bold uppercase tracking-wider
                transition-all duration-200
                ${
                  isActive
                    ? "border-purple-400 bg-purple-500/20 text-purple-300"
                    : "border-gray-700 bg-gray-900/50 text-gray-500 hover:border-gray-600 hover:text-gray-400"
                }
              `}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                  isActive ? "bg-purple-500/30 text-purple-300" : "bg-gray-800 text-gray-500"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Device List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 pr-2">
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <HelpCircle className="mb-2 h-8 w-8 text-gray-600" />
              <p className="font-mono text-sm text-gray-500">NO_DEVICES_MATCH_FILTER</p>
            </div>
          ) : (
            filteredDevices.map((device) => {
              const DeviceIcon = DEVICE_ICONS[device.deviceType];
              const trustConfig = TRUST_CONFIG[device.trustLevel];
              const TrustIcon = trustConfig.icon;
              const isSelected = selectedDeviceId === device.id;
              const isOnline = device.status === "online";

              return (
                <button
                  key={device.id}
                  onClick={() => onSelectDevice(device)}
                  className={`
                    group relative w-full rounded-lg border p-3 text-left
                    transition-all duration-200
                    ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-500/10"
                        : `border-gray-800 bg-gray-900/30 hover:border-gray-700 hover:bg-gray-900/50`
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Device Icon */}
                    <div
                      className={`
                        flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                        ${isOnline ? "bg-cyan-500/10" : "bg-gray-800/50"}
                      `}
                    >
                      <DeviceIcon
                        className={`h-5 w-5 ${isOnline ? "text-cyan-400" : "text-gray-500"}`}
                      />
                    </div>

                    {/* Device Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`truncate font-mono text-sm font-bold ${
                            isOnline ? "text-gray-200" : "text-gray-500"
                          }`}
                        >
                          {device.name}
                        </h4>
                        {/* Online/Offline indicator */}
                        {isOnline ? (
                          <Wifi className="h-3 w-3 shrink-0 text-emerald-400" />
                        ) : (
                          <WifiOff className="h-3 w-3 shrink-0 text-gray-600" />
                        )}
                      </div>

                      <p className="truncate font-mono text-xs text-gray-500">
                        {device.ipAddress} • {device.ownerLabel || device.vendor}
                      </p>

                      <div className="mt-1.5 flex items-center gap-2">
                        {/* Device Type Badge */}
                        <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[9px] uppercase text-gray-400">
                          {device.deviceType}
                        </span>

                        {/* Trust Level Badge */}
                        <span
                          className={`
                            flex items-center gap-1 rounded px-1.5 py-0.5
                            font-mono text-[9px] uppercase
                            ${trustConfig.bgColor} ${trustConfig.color}
                          `}
                        >
                          <TrustIcon className="h-2.5 w-2.5" />
                          {device.requestedBlockState ? "block requested" : device.trustLevel}
                        </span>

                        {/* Latency */}
                        {device.latencyMs !== undefined && (
                          <span className="font-mono text-[9px] text-gray-500">
                            {device.latencyMs}ms
                          </span>
                        )}
                        <span className="font-mono text-[9px] uppercase text-cyan-500/80">
                          {device.confidence} / {device.lastScanSource}
                        </span>
                        {device.room && (
                          <span className="font-mono text-[9px] uppercase text-purple-400/80">
                            {device.room}
                          </span>
                        )}
                        {!device.manuallyVerified && (
                          <span className="font-mono text-[9px] uppercase text-yellow-400/80">
                            unverified
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
