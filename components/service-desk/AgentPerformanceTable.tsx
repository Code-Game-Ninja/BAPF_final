"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface AgentPerformance {
  agent_id: string;
  agent_name: string;
  tickets_resolved: number;
  avg_resolution_minutes: number;
  sla_compliance_rate: number;
}

interface AgentPerformanceTableProps {
  agents: AgentPerformance[];
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function AgentPerformanceTable({ agents }: AgentPerformanceTableProps) {
  if (agents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        No agent performance data available.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-border hover:bg-transparent">
          <TableHead className="text-xs uppercase tracking-wider font-heading">Agent</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Resolved</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading text-right">Avg Time</TableHead>
          <TableHead className="text-xs uppercase tracking-wider font-heading text-right">SLA Rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {agents
          .sort((a, b) => b.tickets_resolved - a.tickets_resolved)
          .map(agent => {
            const slaColor =
              agent.sla_compliance_rate >= 80
                ? "text-green-400"
                : agent.sla_compliance_rate >= 60
                ? "text-amber-400"
                : "text-red-400";

            const SlaIcon =
              agent.sla_compliance_rate >= 80
                ? TrendingUp
                : agent.sla_compliance_rate >= 60
                ? Minus
                : TrendingDown;

            return (
              <TableRow key={agent.agent_id} className="border-border hover:bg-muted/30">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {agent.agent_name?.charAt(0)?.toUpperCase() ?? "?"}
                      </span>
                    </div>
                    <span className="text-sm font-medium">{agent.agent_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {agent.tickets_resolved}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatTime(agent.avg_resolution_minutes)}
                </TableCell>
                <TableCell className="text-right">
                  <div className={`flex items-center justify-end gap-1 ${slaColor}`}>
                    <SlaIcon className="w-3.5 h-3.5" />
                    <span className="text-sm font-medium">{agent.sla_compliance_rate}%</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
      </TableBody>
    </Table>
  );
}
