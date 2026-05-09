"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  FileText,
  History,
  Send,
  MoreVertical,
  CheckCircle,
  XCircle,
  Zap,
  IndianRupee,
  Building2,
  FileSearch,
  ArrowRight,
  TrendingUp,
  Briefcase,
  LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { useBusinessCases } from "@/lib/hooks/use-business-cases";
import { BusinessCase, CaseStatus } from "@/lib/types";
import { pageTransition, staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Safe date formatter that handles null/undefined/invalid dates
function safeFormatDate(dateValue: string | Date | null | undefined, formatStr: string): string {
  if (!dateValue) return "—";
  try {
    // Handle Date objects
    let date: Date;
    if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === "string") {
      // Try to parse ISO string or standard date string
      date = new Date(dateValue);
    } else {
      return "—";
    }
    
    // Check if valid date
    if (isNaN(date.getTime()) || date.getTime() === 0) {
      return "—";
    }
    
    return format(date, formatStr);
  } catch {
    return "—";
  }
}
const STATUS_CONFIG: Record<CaseStatus, { label: string; color: string; icon: LucideIcon }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  processing: { label: "Processing", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: Sparkles },
  pending_customer: { label: "Pending Customer", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
  pending_insurer: { label: "Pending Insurer", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertCircle },
  won: { label: "Won / Issued", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  lost: { label: "Lost", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: XCircle },
  done: { label: "Completed", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: CheckCircle },
  rejected: { label: "Rejected", color: "bg-rose-500/10 text-rose-500 border-rose-500/20", icon: XCircle },
};

interface BusinessCasePayload {
  insurer_name?: string;
  selected_insurer?: string;
  estimated_value?: number;
  probability?: number;
  remark?: string;
  remark_updated_at?: string;
  action_needed?: string;
  [key: string]: unknown;
}

const STAGES = [
  { id: 'open', label: 'Intake' },
  { id: 'processing', label: 'Quote Engine' },
  { id: 'pending_insurer', label: 'Underwriting' },
  { id: 'won', label: 'Issuance' }
];

export default function BusinessCaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const { data: cases, isLoading } = useBusinessCases();
  const [issuing, setIssuing] = useState(false);
  
  // Debug: Log component mount
  console.log('[BusinessCase] Component render', { 
    caseId, 
    isLoading, 
    casesCount: cases?.length,
    issuing 
  });
  
  const bc = useMemo(() => {
    const found = cases?.find(c => c.id === caseId);
    console.log('[BusinessCase] Business case data:', { 
      caseId, 
      found: !!found, 
      status: found?.status,
      customer_id: found?.customer_id,
      lob: found?.lob
    });
    return found;
  }, [cases, caseId]);

  const handleCompareQuotes = () => {
    console.log('[BusinessCase] Compare Quotes clicked');
    // Navigate to quote comparison or show modal
    toast.info("Quote comparison feature coming soon!");
  };

  const handleIssuePolicy = async () => {
    console.log('[BusinessCase] Issue Policy clicked', { bc: bc?.id, status: bc?.status });
    if (!bc) {
      console.error('[BusinessCase] No business case data available');
      toast.error("Business case data not available");
      return;
    }
    setIssuing(true);
    try {
      // Navigate to intake with pre-filled data from business case
      const queryParams = new URLSearchParams({
        category: bc.lob,
        action: 'new_policy',  // Use valid action ID
        customer_id: bc.customer_id || '',
        case_id: bc.id,
        insurer: (bc.payload as BusinessCasePayload)?.insurer_name || '',
        premium: String((bc.payload as BusinessCasePayload)?.estimated_value || 0)
      });
      const targetUrl = `/dashboard/intake?${queryParams.toString()}`;
      console.log('[BusinessCase] Navigating to:', targetUrl);
      router.push(targetUrl);
      toast.success("Redirecting to policy issuance...");
    } catch (error) {
      console.error('[BusinessCase] Navigation error:', error);
      toast.error("Failed to initiate policy issuance");
    } finally {
      setIssuing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pt-10">
        <Skeleton className="h-12 w-48 rounded-xl" />
        <Skeleton className="h-[500px] w-full rounded-[2.5rem]" />
      </div>
    );
  }

  if (!bc) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Briefcase className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold tracking-tight">Case Not Found</h2>
        <Button onClick={() => router.push("/dashboard/business-cases")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto space-y-6 pb-20" 
      {...pageTransition}
      style={{ pointerEvents: 'auto' }}
    >
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button 
          variant="ghost" 
          onClick={() => {
            console.log('[BusinessCase] Back button clicked');
            router.push("/dashboard/business-cases");
          }} 
          className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Pipeline Overview
        </Button>
        
        <div className="flex items-center gap-3">
           <Button 
              variant="outline" 
              className="h-10 rounded-xl px-4 bg-card/50 border-border/60 font-bold text-xs uppercase tracking-wider"
              onClick={handleCompareQuotes}
            >
              <FileSearch className="mr-2 h-4 w-4" /> Compare Quotes
           </Button>
           {(() => {
             const isWon = bc.status === 'won' || bc.status === 'done';
             console.log('[BusinessCase] Issue Policy button render:', { 
               status: bc.status, 
               isWon 
             });
             return !isWon ? (
              <Button 
                className="h-10 rounded-xl px-6 bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-[2px] shadow-lg shadow-primary/20"
                onClick={handleIssuePolicy}
                disabled={issuing}
              >
                {issuing ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4 fill-current" />}
                Issue Policy
              </Button>
             ) : (
              <Button 
                className="h-10 rounded-xl px-6 bg-emerald-500/10 text-emerald-500 font-black text-[10px] uppercase tracking-[2px] pointer-events-none"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Policy Issued
              </Button>
             );
           })()}
        </div>
      </div>

      {/* Advanced Pipeline Visualizer */}
      <section className="bg-card/40 border border-border rounded-[2.5rem] p-8 shadow-xl shadow-black/5">
         <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
            {STAGES.map((stage, i) => {
               const isActive = bc.status === stage.id || (bc.status === 'won' && i === STAGES.length - 1);
               const isPast = STAGES.findIndex(s => s.id === bc.status) > i || bc.status === 'won';
               
               return (
                 <div key={stage.id} className="flex-1 w-full relative flex items-center gap-4 group">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500 z-10",
                      isActive ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110" : 
                      isPast ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" : 
                      "bg-muted/30 text-muted-foreground"
                    )}>
                       {isPast && !isActive ? <CheckCircle className="h-6 w-6" /> : <span className="text-sm font-black">{i + 1}</span>}
                    </div>
                    <div>
                       <p className={cn(
                         "text-[10px] font-black uppercase tracking-widest",
                         isActive ? "text-primary" : "text-muted-foreground"
                       )}>{stage.label}</p>
                       <p className="text-xs font-bold text-foreground/60">{isActive ? "Processing..." : isPast ? "Completed" : "Pending"}</p>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className="hidden lg:block absolute left-[52px] right-[-32px] top-1/2 h-[2px] bg-border/40 -z-0">
                         {isPast && <div className="h-full bg-emerald-500/30 animate-in fade-in slide-in-from-left duration-1000" style={{ width: '100%' }} />}
                      </div>
                    )}
                 </div>
               );
            })}
         </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[2.5rem] border-border/60 bg-card shadow-2xl shadow-black/5 overflow-hidden">
               <CardHeader className="bg-muted/10 border-b border-border/40 p-8">
                  <div className="flex items-center justify-between mb-2">
                     <p className="font-black font-mono text-primary text-xl tracking-tighter">{bc.case_number}</p>
                     <Badge className={cn("rounded-lg px-2 py-1 flex items-center gap-1.5 w-fit border-2", STATUS_CONFIG[bc.status]?.color)}>
                        <span className="text-[10px] font-black uppercase tracking-tight">{STATUS_CONFIG[bc.status]?.label}</span>
                     </Badge>
                  </div>
                  <h2 className="text-3xl font-bold tracking-tighter capitalize">
                     {bc.lob.replace(/_/g, ' ')} <span className="text-muted-foreground font-light text-xl">({bc.case_type})</span>
                  </h2>
               </CardHeader>
               <CardContent className="p-8 space-y-10">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                     <StatDetail label="Expected Premium" value={formatCurrency(((bc.payload as BusinessCasePayload)?.estimated_value as number) || 0)} icon={IndianRupee} color="text-emerald-500" />
                     <StatDetail label="Insurer Proposed" value={((bc.payload as BusinessCasePayload)?.insurer_name as string) || ((bc.payload as BusinessCasePayload)?.selected_insurer as string) || "—"} icon={Building2} />
                     <StatDetail label="Probability" value={`${((bc.payload as BusinessCasePayload)?.probability as number) || 0}%`} icon={TrendingUp} color="text-primary" />
                     <StatDetail label="Created Date" value={safeFormatDate(bc.createdAt, "dd MMM, yyyy")} icon={Clock} />
                  </div>

                  <Separator className="bg-border/40" />

                  <div className="space-y-4">
                     <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Recent Activity Pipeline</h3>
                     <div className="space-y-4">
                        <ActivityLine 
                          title="Business Case Created" 
                          time={safeFormatDate(bc.createdAt, "hh:mm a")} 
                          text={`${bc.lob.replace(/_/g, ' ')} case created${(bc.payload as BusinessCasePayload)?.insurer_name ? ` with ${(bc.payload as BusinessCasePayload).insurer_name}` : ''}. Expected premium: ${formatCurrency(((bc.payload as BusinessCasePayload)?.estimated_value as number) || 0)}`}
                        />
                        {((bc.payload as BusinessCasePayload)?.remark as string) && (
                          <ActivityLine 
                            title="Latest Remark" 
                            time={((bc.payload as BusinessCasePayload)?.remark_updated_at as string) ? safeFormatDate((bc.payload as BusinessCasePayload)?.remark_updated_at as string, "dd MMM, hh:mm a") : "—"} 
                            text={(bc.payload as BusinessCasePayload)?.remark as string}
                          />
                        )}
                     </div>
                  </div>
               </CardContent>
            </Card>
         </div>

         <div className="space-y-6">
             <Card className="rounded-[2rem] border-border/60 bg-card overflow-hidden shadow-xl shadow-black/5">
                <CardHeader className="bg-primary/5 py-6">
                   <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <User className="h-4 w-4" /> Customer Entity
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                         {bc.customers?.name?.[0] || '?'}
                      </div>
                      <div>
                         <p className="text-lg font-bold tracking-tight">{bc.customers?.name || "Unknown Customer"}</p>
                         <p className="text-xs text-muted-foreground font-mono">{bc.customers?.phone || "—"}</p>
                      </div>
                   </div>
                   <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-xl border-border font-bold tracking-tight hover:bg-muted"
                      onClick={() => router.push(`/dashboard/customers/${bc.customer_id}`)}
                   >
                      Manage Account
                   </Button>
                </CardContent>
             </Card>

             <Card className="rounded-[2rem] border-border/60 bg-card/40 p-8 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Action Needed</h3>
                {((bc.payload as BusinessCasePayload)?.action_needed as string) || ((bc.payload as BusinessCasePayload)?.remark as string) ? (
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                     <p className="text-xs font-medium text-amber-700 leading-relaxed">
                        {((bc.payload as BusinessCasePayload)?.action_needed as string) || ((bc.payload as BusinessCasePayload)?.remark as string)}
                     </p>
                     <Button className="w-full h-8 rounded-lg bg-amber-500 text-white font-bold text-[9px] uppercase tracking-widest hover:bg-amber-600 border-none shadow-sm">
                        View Details
                     </Button>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-muted/30 border border-border/40 text-center">
                     <p className="text-xs text-muted-foreground">No pending actions.</p>
                  </div>
                )}
              </Card>
         </div>
      </div>
    </motion.div>
  );
}

function StatDetail({ label, value, icon: Icon, color }: { label: string, value: string, icon: LucideIcon, color?: string }) {
  return (
    <div className="space-y-1">
       <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
       </div>
       <p className={cn("text-lg font-bold tracking-tight", color)}>{value}</p>
    </div>
  );
}

function ActivityLine({ title, time, text }: { title: string, time: string, text: string }) {
  return (
    <div className="flex gap-4">
       <div className="flex flex-col items-center">
          <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
          <div className="h-full w-[2px] bg-border/40" />
       </div>
       <div className="pb-6">
          <div className="flex items-center gap-2 mb-1">
             <h4 className="text-xs font-bold tracking-tight">{title}</h4>
             <span className="text-[9px] text-muted-foreground uppercase font-black">{time}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
       </div>
    </div>
  );
}
