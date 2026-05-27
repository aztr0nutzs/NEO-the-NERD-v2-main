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
        {/*
          Robot video — the `screen` variant owns the feathered cutout framing,
          so the robot fills the compact surface cleanly with no outer ring and
          no reliance on blend modes.
        */}
        <div className="relative h-28 w-28 sm:h-32 sm:w-32">
          <NeoAvatarVideo
            className="absolute inset-0 h-full w-full"
            variant="screen"
            reactionKey={status === "scanning" ? "thinking" : status === "alert" ? "surprised" : null}
            reactionId={status === "scanning" ? 1 : status === "alert" ? 2 : null}
            ariaLabel="N.E.O. network avatar"
          />
        </div>
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
    sm: "h-10 w-10",
    md: "h-14 w-14",
  };

  return (
    <div className={`relative ${sizeClasses[size]}`}>
      <NeoAvatarVideo
        className="absolute inset-0 h-full w-full"
        variant="screen"
        reactionKey={status === "scanning" ? "thinking" : status === "alert" ? "surprised" : null}
        reactionId={status === "scanning" ? 1 : status === "alert" ? 2 : null}
        ariaLabel="N.E.O. network badge avatar"
      />
    </div>
  );
}
