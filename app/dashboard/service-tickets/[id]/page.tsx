"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  LifeBuoy, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Phone, 
  Mail, 
  FileText,
  History,
  Send,
  MoreVertical,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  LucideIcon
} from "lucide-react";
import { format } from "date-fns";
import { useServiceTickets } from "@/lib/hooks/use-business-cases";
import { TicketStatus, TicketPriority } from "@/lib/types";
import { pageTransition } from "@/lib/helpers/animations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: LucideIcon }> = {
  open: { label: "Open", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", icon: Sparkles },
  pending: { label: "Pending", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: Clock },
  pending_customer: { label: "Pending Customer", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: AlertCircle },
  resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
  closed: { label: "Closed", color: "bg-slate-500/10 text-slate-500 border-slate-500/20", icon: History },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string; icon: LucideIcon }> = {
  low: { label: "Low", color: "text-slate-400", icon: ShieldCheck },
  medium: { label: "Medium", color: "text-amber-500", icon: AlertCircle },
  high: { label: "High", color: "text-orange-500", icon: AlertTriangle },
  urgent: { label: "Urgent", color: "text-rose-500", icon: AlertTriangle },
};


export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { data: tickets, isLoading } = useServiceTickets();
  
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ticket = useMemo(() => {
    return tickets?.find(t => t.id === ticketId);
  }, [tickets, ticketId]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 pt-10">
        <Skeleton className="h-12 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <LifeBuoy className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-bold tracking-tight">Ticket Not Found</h2>
        <Button onClick={() => router.push("/dashboard/service-tickets")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const handlePostComment = () => {
    if (!comment.trim()) return;
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success("Update posted to timeline");
      setComment("");
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <motion.div className="max-w-7xl mx-auto space-y-6 pb-20" {...pageTransition}>
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => router.push("/dashboard/service-tickets")} className="h-10 rounded-xl px-4 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Desk
        </Button>
        
        <div className="flex items-center gap-2">
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-xl px-4 bg-card/50 border-border/60">
                Action Workflow <MoreVertical className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-border p-2">
              <DropdownMenuItem className="rounded-xl py-2 cursor-pointer">
                <ArrowUpRight className="h-4 w-4 mr-2" /> Assign to Agent
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-xl py-2 cursor-pointer">
                <Clock className="h-4 w-4 mr-2" /> Mark In Progress
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border/50" />
              <DropdownMenuItem className="rounded-xl py-2 cursor-pointer text-emerald-500 focus:text-emerald-500">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Resolve Ticket
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Info Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-border bg-card/40 p-10 shadow-2xl shadow-primary/5">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl opacity-50" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="md:col-span-2 space-y-4">
             <div className="flex items-center gap-3">
               <span className="font-black font-mono text-primary text-xl tracking-tighter">{ticket.ticket_number}</span>
               <Badge className={cn("rounded-lg px-2 py-1 flex items-center gap-1.5 w-fit border-2", STATUS_CONFIG[ticket.status]?.color)}>
                  <span className="text-[10px] font-black uppercase tracking-tight">{STATUS_CONFIG[ticket.status]?.label}</span>
               </Badge>
             </div>
             <h1 className="text-4xl font-bold tracking-tighter capitalize font-heading">
               {ticket.category.replace(/_/g, ' ')}
             </h1>
             <p className="text-muted-foreground max-w-xl leading-relaxed">
               {ticket.description || "No detailed description provided for this service request."}
             </p>
          </div>
          
          <div className="flex flex-col justify-between items-end gap-6 border-l border-border/60 pl-10 hidden md:flex">
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Priority Level</p>
                <div className="flex items-center gap-2 justify-end">
                   <span className={cn("text-lg font-bold uppercase tracking-tight", PRIORITY_CONFIG[ticket.priority]?.color)}>
                      {PRIORITY_CONFIG[ticket.priority]?.label}
                   </span>
                   {(() => {
                      const Icon = PRIORITY_CONFIG[ticket.priority]?.icon;
                      return <Icon className={cn("h-5 w-5", PRIORITY_CONFIG[ticket.priority]?.color)} />;
                   })()}
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">SLA Deadline</p>
                <p className="text-lg font-bold tracking-tight text-rose-500">
                   {format(new Date(new Date(ticket.createdAt).getTime() + 48*60*60*1000), "dd MMM, hh:mm a")}
                </p>
             </div>
          </div>
        </div>
      </section>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Tabs defaultValue="timeline">
             <TabsList className="bg-muted/10 p-1 h-12 rounded-2xl border border-border/40">
               <TabsTrigger value="timeline" className="rounded-xl px-6 data-[state=active]:bg-card shadow-sm">Process Timeline</TabsTrigger>
               <TabsTrigger value="details" className="rounded-xl px-6 data-[state=active]:bg-card shadow-sm">Technical Specs</TabsTrigger>
               <TabsTrigger value="documents" className="rounded-xl px-6 data-[state=active]:bg-card shadow-sm">Attachments</TabsTrigger>
             </TabsList>

             <TabsContent value="timeline" className="pt-6 space-y-6">
                <Card className="border-border/60 bg-card/20 rounded-[2rem]">
                  <CardContent className="p-8">
                     <div className="space-y-8 relative">
                        <div className="absolute left-4 top-1 bottom-1 w-[2px] bg-border/40" />
                        
                        <TimelineItem 
                          icon={Clock}
                          title="Ticket Created"
                          date={format(new Date(ticket.createdAt), "dd MMM, hh:mm a")}
                          user="System Logic"
                          text="Service request successfully registered from the central intake desk."
                        />
                        
                        <TimelineItem 
                          icon={User}
                          title="Assignment Update"
                          date={format(new Date(ticket.createdAt), "dd MMM, hh:mm a")}
                          user="AI Orchestrator"
                          text={`Auto-assigned to ${ticket.assigned_to_name || 'Agent Desk #1'} based on category specialization.`}
                        />

                        {/* Interactive Post Section */}
                        <div className="relative pl-12 pt-4">
                           <div className="p-6 rounded-[2rem] border border-primary/20 bg-primary/5 space-y-4 shadow-inner">
                              <Textarea 
                                placeholder="Post an update or internal note..." 
                                className="min-h-[100px] border-none bg-transparent focus-visible:ring-0 px-0 text-sm font-medium"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                              />
                              <div className="flex items-center justify-between border-t border-primary/10 pt-4">
                                 <p className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Visibility: Internal Only</p>
                                 <Button 
                                    className="h-10 rounded-xl px-6 bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20"
                                    onClick={handlePostComment}
                                    disabled={!comment.trim() || isSubmitting}
                                 >
                                    {isSubmitting ? "Posting..." : <><Send className="mr-2 h-4 w-4" /> Post Update</>}
                                 </Button>
                              </div>
                           </div>
                        </div>
                     </div>
                  </CardContent>
                </Card>
             </TabsContent>

             <TabsContent value="details" className="pt-6">
                <Card className="border-border/60 bg-card/20 rounded-[2rem]">
                  <CardContent className="p-8 grid gap-8 md:grid-cols-2">
                     <DetailRow label="Policy Reference" value={ticket.policy_id || "N/A"} mono />
                     <DetailRow label="Case Category" value={ticket.category} color="text-primary" capitalize />
                     <DetailRow label="Sub-type" value="Endorsement / Alteration" />
                     <DetailRow label="Request ID" value={ticket.id} mono />
                  </CardContent>
                </Card>
             </TabsContent>

             <TabsContent value="documents" className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <DocumentCard name="Request_Copy.pdf" type="Request Letter" size="1.2 MB" />
                   <DocumentCard name="Policy_Pre_Alt.pdf" type="Existing Policy" size="4.5 MB" />
                </div>
             </TabsContent>
           </Tabs>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <Card className="border-border/60 bg-card overflow-hidden rounded-[2rem] shadow-xl shadow-black/5">
              <CardHeader className="bg-muted/30 border-b border-border/40 py-6">
                 <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" /> Associated Customer
                 </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xl font-black">
                       {ticket.customers?.name ? ticket.customers.name[0] : 'C'}
                    </div>
                    <div>
                       <p className="text-xl font-bold tracking-tight">{ticket.customers?.name || "Premium Client"}</p>
                       <p className="text-xs text-muted-foreground font-mono">UID: {ticket.customers?.uid || "C-8812"}</p>
                    </div>
                 </div>
                 
                 <Separator className="bg-border/40" />
                 
                 <div className="space-y-4">
                    <SidebarInfoRow icon={Phone} label="Contact" value={ticket.customers?.phone || "N/A"} />
                    <SidebarInfoRow icon={Mail} label="Email" value={ticket.customers?.email || "N/A"} />
                 </div>

                 <Button 
                    variant="outline" 
                    className="w-full h-12 rounded-xl border-border hover:bg-muted font-bold tracking-tight"
                    onClick={() => router.push(`/dashboard/customers/${ticket.customer_id}`)}
                 >
                    View Account Hub
                 </Button>
              </CardContent>
           </Card>

           <Card className="border-border/60 bg-primary/5 rounded-[2rem] shadow-sm overflow-hidden">
              <CardContent className="p-8 space-y-4">
                 <div className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 bg-primary" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Operational Intelligence</p>
                 </div>
                 <p className="text-xs leading-relaxed font-medium text-foreground/80">
                    This ticket is linked to a **Critical Renewal** window. Prioritize resolution within 24 hours to prevent policy lapse.
                 </p>
                 <Button className="w-full h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[10px] uppercase shadow-none">
                    View Policy Linked (3)
                 </Button>
              </CardContent>
           </Card>
        </div>
      </div>
    </motion.div>
  );
}

function TimelineItem({ icon: Icon, title, date, user, text }: { icon: LucideIcon, title: string, date: string, user: string, text: string }) {
  return (
    <div className="relative pl-12">
      <div className="absolute left-0 top-0 h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground shadow-sm">
         <Icon className="h-4 w-4" />
      </div>
      <div>
         <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold tracking-tight">{title}</h4>
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">• {date}</span>
         </div>
         <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">BY: {user}</p>
         <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 text-xs text-muted-foreground font-medium leading-relaxed">
            {text}
         </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono, capitalize, color }: { label: string, value: string, mono?: boolean, capitalize?: boolean, color?: string }) {
  return (
    <div>
       <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
       <p className={cn(
         "text-sm font-bold tracking-tight text-foreground/90",
         mono && "font-mono text-xs uppercase",
         capitalize && "capitalize",
         color
       )}>
          {value}
       </p>
    </div>
  );
}

function SidebarInfoRow({ icon: Icon, label, value }: { icon: LucideIcon, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3">
       <div className="h-8 w-8 rounded-lg bg-muted/30 flex items-center justify-center text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
       </div>
       <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
          <p className="text-xs font-black tracking-tight">{value}</p>
       </div>
    </div>
  );
}

function DocumentCard({ name, type, size }: { name: string, type: string, size: string }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-[1.5rem] border border-border/60 bg-muted/10 hover:bg-muted/20 transition-all group">
       <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
             <FileText className="h-5 w-5" />
          </div>
          <div>
             <p className="text-xs font-bold leading-tight">{name}</p>
             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-0.5">{type} • {size}</p>
          </div>
       </div>
       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary">
          <ExternalLink className="h-4 w-4" />
       </Button>
    </div>
  );
}
