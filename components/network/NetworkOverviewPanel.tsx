"use client";

import { motion, animate, useMotionValue, useTransform } from "framer-motion";
import { useEffect } from "react";
import { Wifi, Monitor, AlertTriangle, Eye, Shield } from "lucide-react";
import type { NetworkHealthSnapshot, NetworkStatus } from "@/lib/network/types";

interface NetworkOverviewPanelProps {
  status: NetworkStatus;
  isDemoMode: boolean;
  scanState?: NetworkStatus["scanState"];
  onJumpToDevices?: () => void;
  onJumpToSecurity?: () => void;
  onJumpToScan?: () => void;
  healthSnapshot?: NetworkHealthSnapshot | null;
}

export function NetworkOverviewPanel({
  status,
  isDemoMode,
  scanState = "idle",
  onJumpToDevices,
  onJumpToSecurity,
  onJumpToScan,
  healthSnapshot,
}: NetworkOverviewPanelProps) {
  const stats = [
    {
      label: "DEVICES_FOUND",
      value: status.devicesFound,
      icon: Monitor,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/50",
      glowColor: "shadow-cyan-500/20",
      onClick: onJumpToDevices,
      interactiveLabel: "Open device list",
    },
    {
      label: "ONLINE",
      value: status.onlineDevices,
      icon: Wifi,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/50",
      glowColor: "shadow-emerald-500/20",
      onClick: onJumpToDevices,
      interactiveLabel: "Open device list",
    },
    {
      label: "NEW_UNKNOWN",
      value: status.unknownDevices,
      icon: AlertTriangle,
      color: "text-yellow-400",
      borderColor: "border-yellow-500/50",
      glowColor: "shadow-yellow-500/20",
      onClick: onJumpToSecurity,
      interactiveLabel: "Open security insights",
    },
    {
      label: "FLAGGED",
      value: status.flaggedDevices,
      icon: Eye,
      color: "text-pink-400",
      borderColor: "border-pink-500/50",
      glowColor: "shadow-pink-500/20",
      onClick: onJumpToSecurity,
      interactiveLabel: "Open flagged insights",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Network Info Bar */}
      <div className="flex flex-wrap items-center gap-2 px-1 text-xs font-mono tracking-wider">
        <div className="flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-gray-400">NETWORK:</span>
          <span className="text-cyan-300">{status.networkName}</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">GATEWAY:</span>
          <span className="text-purple-300">{status.gatewayIp}</span>
        </div>
        <span className="text-gray-600">|</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-400">LOCAL:</span>
          <span className="text-emerald-300">{status.localIp}</span>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.label}
              type="button"
              onClick={stat.onClick}
              disabled={!stat.onClick}
              title={stat.interactiveLabel}
              whileHover={stat.onClick ? { y: -2, scale: 1.01 } : undefined}
              whileTap={stat.onClick ? { scale: 0.98 } : undefined}
              className={`
                relative overflow-hidden rounded-lg border bg-black/60
                p-4 text-left backdrop-blur-sm transition-all duration-300
                ${stat.onClick ? "cursor-pointer hover:shadow-lg" : "cursor-default"}
                ${stat.borderColor} ${stat.glowColor}
              `}
            >
              {scanState === "scanning" && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    background:
                      "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.35) 45%, transparent 70%)",
                    animation: "scanSweep 1.6s linear infinite",
                  }}
                />
              )}
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className="h-full w-full"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%23ffffff' stroke-width='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: "30px 30px",
                  }}
                />
              </div>

              <div className="relative flex items-center justify-between">
                <div>
                  <p className="mb-1 font-mono text-[10px] tracking-widest text-gray-500">
                    {stat.label}
                  </p>
                  <CountValue value={stat.value} className={`text-3xl font-black italic ${stat.color}`} />
                </div>
                <Icon className={`h-8 w-8 opacity-40 ${stat.color} ${stat.label === "FLAGGED" && stat.value > 0 ? "animate-pulse" : ""}`} />
              </div>

              {/* Corner Accent */}
              <div
                className={`absolute right-0 top-0 h-6 w-6 ${stat.color}`}
                style={{
                  clipPath: "polygon(100% 0, 0 0, 100% 100%)",
                  opacity: 0.1,
                }}
              />
            </motion.button>
          );
        })}
      </div>

      <motion.button
        type="button"
        onClick={onJumpToScan}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full rounded-lg border border-purple-500/35 bg-purple-500/10 px-3 py-2 text-left"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.25em] text-purple-300">SCAN HUD</span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-white/75">
            {scanState === "scanning" ? "SCANNING ACTIVE" : "OPEN SCAN CONTROLS"}
          </span>
        </div>
      </motion.button>

      {healthSnapshot && (
        <button
          type="button"
          onClick={onJumpToScan}
          className="w-full rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-left"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-[0.25em] text-emerald-300">
              HEALTH // {healthSnapshot.grade.toUpperCase()}
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-white/80">
              {healthSnapshot.score}/100 · {healthSnapshot.trend.toUpperCase()}
            </span>
          </div>
        </button>
      )}

      {/* Demo Mode Notice */}
      {isDemoMode && (
        <div className="flex items-center gap-2 rounded border border-orange-500/30 bg-orange-500/5 px-3 py-2 font-mono text-xs text-orange-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            DEMO_ADAPTER // Displaying simulated device data. Install/run the Android app for live local LAN scanning.
          </span>
        </div>
      )}
    </div>
  );
}

function CountValue({ value, className }: { value: number; className: string }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.4, ease: "easeOut" });
    return () => controls.stop();
  }, [motionValue, value]);
  return <motion.p className={className}>{rounded}</motion.p>;
}
