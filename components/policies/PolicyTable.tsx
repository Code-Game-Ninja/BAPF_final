"use client";

import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Settings2, Eye, Mail, Trash2, Loader2, AlertCircle, Zap } from "lucide-react";
import { formatCurrency, formatCurrencyLabel } from "@/lib/utils";
import { Policy } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface PolicyTableProps {
  policies: Policy[];
  onDelete: (policy: Policy) => void;
  onSendEmail: (policy: Policy) => void;
  sendingReminderId?: string | null;
  deletingPolicyId?: string | null;
  isAdmin?: boolean;
}

export function PolicyTable({ 
  policies, 
  onDelete, 
  onSendEmail, 
  sendingReminderId, 
  deletingPolicyId,
  isAdmin 
}: PolicyTableProps) {
  const router = useRouter();
  const [columnVisibility, setColumnVisibility] = useState({
    policyNumber: true,
    type: true,
    customer: true,
    insurer: true,
    premium: true,
    expiry: true,
    status: true,
    vehicleNo: false,
    assignedTo: false,
    netPremium: false,
    tpPremium: false,
    gst: false,
    commission: false,
  });

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-green-500/20 text-green-400 border-green-500/30",
    expired: "bg-red-500/20 text-red-400 border-red-500/30",
    cancelled: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    archived: "bg-muted-foreground/20 text-muted-foreground border-muted-foreground/30",
  };

  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 border-dashed bg-primary/5 text-primary hover:bg-primary/10 border-primary/20"
              onClick={async () => {
                const { commissionService } = await import("@/lib/services/commission.service");
                toast.promise(commissionService.bulkCalculate("SYSTEM", "Policy Table Trigger"), {
                   loading: "Calculating commissions...",
                   success: (res) => `Calculated ${res.created} new commissions.`,
                   error: "Failed to run engine."
                });
              }}
            >
              <Zap className="mr-2 h-4 w-4 fill-current" /> Run Comm. Engine
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 border-dashed bg-muted/20">
                <Settings2 className="mr-2 h-4 w-4" /> Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {Object.entries(columnVisibility).map(([key, value]) => (
                <DropdownMenuCheckboxItem
                  key={key}
                  checked={value}
                  onCheckedChange={(checked) => 
                    setColumnVisibility(prev => ({ ...prev, [key]: checked }))
                  }
                  className="capitalize"
                >
                  {key.replace(/([A-Z])/g, ' $1')}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-card/90 shadow-[0_10px_22px_rgba(47,62,64,0.04)]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/55 hover:bg-transparent">
              {columnVisibility.policyNumber && <TableHead>Policy #</TableHead>}
              {columnVisibility.type && <TableHead>Type</TableHead>}
              {columnVisibility.customer && <TableHead>Customer</TableHead>}
              {columnVisibility.insurer && <TableHead>Insurer</TableHead>}
              {columnVisibility.vehicleNo && <TableHead>Vehicle No</TableHead>}
              {columnVisibility.assignedTo && <TableHead>Assigned To</TableHead>}
              {columnVisibility.premium && <TableHead className="text-right">Premium</TableHead>}
              {columnVisibility.expiry && <TableHead>Expiry</TableHead>}
              {columnVisibility.status && <TableHead>Status</TableHead>}
              {columnVisibility.netPremium && <TableHead className="text-right">Net Premium</TableHead>}
              {columnVisibility.tpPremium && <TableHead className="text-right">TP</TableHead>}
              {columnVisibility.gst && <TableHead className="text-right">GST</TableHead>}
              {columnVisibility.commission && <TableHead className="text-right">Comm %</TableHead>}
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="h-32 text-center text-muted-foreground italic">
                  No policies found.
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => (
                <TableRow
                  key={policy.id}
                  className="cursor-pointer transition-colors hover:bg-muted/45"
                  onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                >
                  {columnVisibility.policyNumber && (
                    <TableCell className="font-mono text-sm font-medium">
                      {policy.policy_number}
                    </TableCell>
                  )}
                  {columnVisibility.type && (
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider">
                        {policy.policy_type}
                      </Badge>
                    </TableCell>
                  )}
                  {columnVisibility.customer && (
                    <TableCell className="text-sm font-bold">
                      {policy.customer_name}
                    </TableCell>
                  )}
                  {columnVisibility.insurer && (
                    <TableCell className="text-sm text-muted-foreground">
                      {policy.insurer_name || "—"}
                    </TableCell>
                  )}
                  {columnVisibility.vehicleNo && (
                    <TableCell className="text-xs font-mono">
                      {policy.motor_meta?.registration_number || policy.vehicle_number || "—"}
                    </TableCell>
                  )}
                  {columnVisibility.assignedTo && (
                    <TableCell className="text-xs text-muted-foreground">
                      {policy.assigned_to_name || "—"}
                    </TableCell>
                  )}
                  {columnVisibility.premium && (
                    <TableCell className="text-right font-mono text-sm" aria-label={formatCurrencyLabel(policy.premium_amount)}>
                      {formatCurrency(policy.premium_amount)}
                    </TableCell>
                  )}
                  {columnVisibility.expiry && (
                    <TableCell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(policy.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </TableCell>
                  )}
                  {columnVisibility.status && (
                    <TableCell>
                      <Badge className={`text-[9px] font-black uppercase tracking-widest ${STATUS_COLORS[policy.status] || ""}`}>
                        {policy.status}
                      </Badge>
                    </TableCell>
                  )}
                  {columnVisibility.netPremium && (
                    <TableCell className="text-right font-mono text-xs opacity-70">
                      {formatCurrency(policy.motor_meta?.net_premium || 0)}
                    </TableCell>
                  )}
                  {columnVisibility.tpPremium && (
                    <TableCell className="text-right font-mono text-xs opacity-70">
                      {formatCurrency(policy.motor_meta?.tp_premium || 0)}
                    </TableCell>
                  )}
                  {columnVisibility.gst && (
                    <TableCell className="text-right font-mono text-xs opacity-70">
                      {formatCurrency(policy.motor_meta?.gst_amount || 0)}
                    </TableCell>
                  )}
                  {columnVisibility.commission && (
                    <TableCell className="text-right font-mono text-xs text-primary font-bold">
                      {policy.finance_meta?.commission_receivable_percent || 0}%
                    </TableCell>
                  )}
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                        title="Send Email Reminder"
                        disabled={sendingReminderId === policy.id}
                        onClick={() => onSendEmail(policy)}
                      >
                        {sendingReminderId === policy.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.push(`/dashboard/policies/${policy.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          disabled={deletingPolicyId === policy.id}
                          onClick={() => onDelete(policy)}
                        >
                          {deletingPolicyId === policy.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
