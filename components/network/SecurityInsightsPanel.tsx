"use client";

import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SecurityInsight, InsightSeverity } from "@/lib/network/types";

interface SecurityInsightsPanelProps {
  insights: SecurityInsight[];
  onViewDevice?: (deviceId: string) => void;
}

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  {
    icon: typeof AlertTriangle;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  high: {
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    label: "HIGH",
  },
  medium: {
    icon: AlertCircle,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    label: "MEDIUM",
  },
  low: {
    icon: Info,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    label: "LOW",
  },
  info: {
    icon: Info,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    label: "INFO",
  },
};

export function SecurityInsightsPanel({ insights, onViewDevice }: SecurityInsightsPanelProps) {
  const sortedInsights = [...insights].sort((a, b) => {
    const order: Record<InsightSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };
    return order[a.severity] - order[b.severity];
  });

  const severityCounts = insights.reduce(
    (acc, insight) => {
      acc[insight.severity] = (acc[insight.severity] || 0) + 1;
      return acc;
    },
    {} as Record<InsightSeverity, number>
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-yellow-500/30 bg-black/60 backdrop-blur-sm">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-yellow-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-yellow-400">
              SECURITY_INSIGHTS
            </h3>
          </div>
          <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 font-mono text-xs text-yellow-400">
            {insights.length}
          </span>
        </div>

        {/* Severity Summary */}
        <div className="mt-3 flex flex-wrap gap-2">
          {(["high", "medium", "low", "info"] as InsightSeverity[]).map((severity) => {
            const config = SEVERITY_CONFIG[severity];
            const count = severityCounts[severity] || 0;
            if (count === 0) return null;
            return (
              <span
                key={severity}
                className={`
                  flex items-center gap-1 rounded-full px-2 py-0.5
                  font-mono text-[10px] font-bold
                  ${config.bgColor} ${config.color}
                `}
              >
                {config.label}: {count}
              </span>
            );
          })}
        </div>
      </div>

      {/* Insights List */}
      <ScrollArea className="flex-1">
        <div className="space-y-2 p-4">
          {sortedInsights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="mb-2 h-8 w-8 text-emerald-500/50" />
              <p className="font-mono text-sm text-emerald-400">NO_SECURITY_ALERTS</p>
              <p className="mt-1 font-mono text-xs text-gray-500">
                All systems nominal
              </p>
            </div>
          ) : (
            sortedInsights.map((insight) => {
              const config = SEVERITY_CONFIG[insight.severity];
              const Icon = config.icon;

              return (
                <div
                  key={insight.id}
                  className={`
                    rounded-lg border p-3 transition-all duration-200
                    ${config.borderColor} ${config.bgColor}
                    hover:brightness-110
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`
                        flex h-8 w-8 shrink-0 items-center justify-center rounded-lg
                        bg-black/30
                      `}
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className={`
                            rounded px-1.5 py-0.5 font-mono text-[9px] font-bold
                            bg-black/20 ${config.color}
                          `}
                        >
                          {config.label}
                        </span>
                      </div>

                      <h4 className={`font-mono text-sm font-bold ${config.color}`}>
                        {insight.title}
                      </h4>

                      <p className="mt-1 font-mono text-xs text-gray-400">
                        {insight.description}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="font-mono text-[10px] text-gray-500">
                          → {insight.recommendedAction}
                        </p>

                        {insight.relatedDeviceId && onViewDevice && (
                          <button
                            onClick={() => onViewDevice(insight.relatedDeviceId!)}
                            className={`
                              flex items-center gap-1 font-mono text-[10px]
                              ${config.color} hover:underline
                            `}
                          >
                            VIEW_DEVICE
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
