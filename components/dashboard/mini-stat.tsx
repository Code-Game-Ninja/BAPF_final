"use client";

import { Card, CardContent } from "@/components/ui/card";

interface MiniStatProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}

export function MiniStat({ icon: Icon, label, value, color }: MiniStatProps) {
  return (
    <Card className="border border-border/70 bg-card shadow-sm">
      <CardContent className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">{value}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
