"use client";

import { Badge } from "@/components/ui/badge";

interface RenewalRiskBadgeProps {
  score: number;
  showScore?: boolean;
}

export function RenewalRiskBadge({ score, showScore = true }: RenewalRiskBadgeProps) {
  const clamped = Math.max(0, Math.min(100, score));

  let colorClass: string;
  let label: string;

  if (clamped <= 33) {
    colorClass = "bg-green-500/10 text-green-400 border-green-500/20";
    label = "Low";
  } else if (clamped <= 66) {
    colorClass = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
    label = "Medium";
  } else {
    colorClass = "bg-red-500/10 text-red-400 border-red-500/20";
    label = "High";
  }

  return (
    <Badge variant="outline" className={`text-xs font-semibold ${colorClass}`}>
      {showScore ? `${clamped} · ${label}` : label}
    </Badge>
  );
}
