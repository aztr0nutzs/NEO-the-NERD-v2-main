"use client";

import { useState } from "react";
import { NeoAvatarVideo } from "@/components/avatar/neo-avatar-video";

interface NeoRobotAvatarProps {
  status: "idle" | "scanning" | "alert" | "success";
  message?: string;
  onClick?: () => void;
}

export function NeoRobotAvatar({ status, message, onClick }: NeoRobotAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);

  const statusColors = {
    idle: { ring: "border-cyan-500/50", glow: "rgba(34,211,238,0.3)" },
    scanning: { ring: "border-purple-500", glow: "rgba(168,85,247,0.5)" },
    alert: { ring: "border-orange-500", glow: "rgba(249,115,22,0.5)" },
    success: { ring: "border-green-500", glow: "rgba(34,197,94,0.5)" },
  };

  const colors = statusColors[status];

  return (
    <div className="relative">
      {/* Robot container */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          group relative flex items-center justify-center transition-transform duration-300
          ${isHovered ? "scale-105" : "scale-100"}
        `}
      >
        {/* Outer glow ring */}
        <div
          className={`
            absolute -inset-2 rounded-full border-2 transition-all duration-300
            ${colors.ring}
            ${status === "scanning" ? "animate-pulse" : ""}
          `}
          style={{
            boxShadow: `0 0 20px ${colors.glow}`,
          }}
        />

        {/* Rotating ring for scanning */}
        {status === "scanning" && (
          <div
            className="absolute -inset-4 rounded-full border border-dashed border-purple-500/50"
            style={{ animation: "spin 8s linear infinite" }}
          />
        )}

        {/* Robot image */}
        <div className="relative h-20 w-20 overflow-hidden rounded-full sm:h-24 sm:w-24">
          <NeoAvatarVideo
            className="absolute inset-1"
            reactionKey={status === "scanning" ? "thinking" : status === "alert" ? "surprised" : null}
            reactionId={status === "scanning" ? 1 : status === "alert" ? 2 : null}
            ariaLabel="N.E.O. network avatar"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        </div>

        {/* Status indicator */}
        <div
          className={`
            absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-black
            ${status === "idle" ? "bg-cyan-400" : ""}
            ${status === "scanning" ? "animate-pulse bg-purple-500" : ""}
            ${status === "alert" ? "animate-pulse bg-orange-500" : ""}
            ${status === "success" ? "bg-green-500" : ""}
          `}
          style={{
            boxShadow: `0 0 8px ${colors.glow}`,
          }}
        />
      </button>

      {/* Speech bubble message */}
      {message && (
        <div className="absolute -right-2 top-full mt-2 z-10">
          <div className="relative rounded-lg border border-cyan-500/30 bg-gray-900/95 px-3 py-2 shadow-lg backdrop-blur-sm">
            {/* Triangle pointer */}
            <div className="absolute -top-2 left-6 h-0 w-0 border-x-[6px] border-b-[8px] border-x-transparent border-b-cyan-500/30" />
            <div className="absolute -top-[6px] left-6 h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-gray-900/95" />

            <p className="max-w-[200px] font-mono text-[10px] leading-relaxed text-cyan-400 sm:text-xs">
              {message}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Smaller inline version for headers/compact spaces
export function NeoRobotBadge({
  status = "idle",
  size = "sm",
}: {
  status?: "idle" | "scanning" | "alert" | "success";
  size?: "sm" | "md";
}) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
  };

  return (
    <div className={`relative ${sizeClasses[size]} overflow-hidden rounded-full`}>
      <NeoAvatarVideo className="absolute inset-0" ariaLabel="N.E.O. network badge avatar" />
      {status === "scanning" && (
        <div className="absolute inset-0 animate-pulse rounded-full ring-2 ring-purple-500/50" />
      )}
    </div>
  );
}
