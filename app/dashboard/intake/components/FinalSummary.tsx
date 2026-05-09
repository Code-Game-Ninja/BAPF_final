"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, User, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTransition } from "@/lib/helpers/animations";
import { Customer } from "@/lib/types";
import { IntakeProductData } from "@/lib/types/intake";

interface Selection {
  category?: string | null;
  action?: string | null;
}

interface Props {
  selection: Selection;
  customer: Customer | 'new';
  productData: IntakeProductData;
  isCreating: boolean;
  onComplete: () => void;
}

export function FinalSummary({ selection, customer, productData, isCreating, onComplete }: Props) {
  const isNew = customer === 'new';
  const customerName = isNew ? "New Profile Onboarding" : (customer as Customer).name;
  const customerUid = isNew ? "Fresh Retail Profile" : `Existing Client (ID: ${(customer as Customer).uid || 'REF-82'})`;
  const initials = isNew ? "" : (customer as Customer).name?.substring(0, 2).toUpperCase() || "??";
  
  const complianceAuditId = useMemo(() => Math.random().toString(36).substring(2, 10).toUpperCase(), []);

  return (
    <motion.div {...pageTransition} className="max-w-4xl mx-auto space-y-8">
      <div className="bg-card/40 rounded-[3rem] border-2 border-border p-12 space-y-12 shadow-2xl relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -top-24 -right-24 h-64 w-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5" /> Ready for Deployment
           </div>
           <h3 className="text-4xl font-bold font-heading">Verify Transaction Scope</h3>
           <p className="text-muted-foreground">The following records will be initialized in the BPAF Core CRM.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Column 1: Entity Mapping */}
          <div className="space-y-6">
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Entity Mapping
             </h4>
             <div className="p-6 rounded-[2rem] border border-border bg-muted/20 space-y-4">
                <div className="flex items-center gap-4">
                   <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      {isNew ? <Zap className="h-6 w-6" /> : initials}
                   </div>
                   <div>
                      <p className="text-sm font-black uppercase tracking-tight">{customerName}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                        {customerUid}
                      </p>
                   </div>
                </div>
                <div className="pt-4 space-y-2 border-t border-border/50">
                   <SummaryDetail label="Phone" value={(!isNew && (customer as Customer).phone) || "CAPTURED"} />
                   <SummaryDetail label="KYC Basis" value={productData?.pan ? `PAN: ${productData.pan}` : "Pending"} />
                </div>
             </div>
          </div>

          {/* Column 2: Product Context */}
          <div className="space-y-6">
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Product Context
             </h4>
             <div className="p-6 rounded-[2rem] border border-border bg-primary/5 space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{selection.category?.toUpperCase() || "MOTOR"}</span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded bg-primary text-white">{selection.action?.toUpperCase() || "NEW"}</span>
                 </div>
                 <div className="space-y-3 pt-2">
                    <p className="text-xl font-bold tracking-tight">
                      {productData.reg_number || productData.plan_name || productData.policy_no || "Unified Policy Record"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                       <SummaryBadge label={productData.make || productData.insurer || "General"} />
                       <SummaryBadge label={`SA: ${productData.sum_assured || 'TBD'}`} />
                       {productData.premium && <SummaryBadge label={`Premium: ₹${productData.premium}`} />}
                    </div>
                 </div>
                 
                 {/* Detailed Policy Information */}
                 <div className="pt-4 space-y-2 border-t border-border/50">
                    {productData.policy_no && <SummaryDetail label="Policy Number" value={productData.policy_no} />}
                    {productData.insurer && <SummaryDetail label="Insurer" value={productData.insurer} />}
                    {productData.start_date && <SummaryDetail label="Start Date" value={productData.start_date} />}
                    {productData.end_date && <SummaryDetail label="End Date" value={productData.end_date} />}
                    {productData.premium && <SummaryDetail label="Premium" value={`₹${productData.premium}`} />}
                    {productData.sum_assured && <SummaryDetail label="Sum Assured" value={`₹${productData.sum_assured}`} />}
                    
                    {/* Motor-specific details */}
                    {selection.category === 'motor' && (
                      <>
                        {productData.reg_number && <SummaryDetail label="Registration" value={productData.reg_number} />}
                        {productData.make && <SummaryDetail label="Make/Model" value={`${productData.make} ${productData.model || ''}`} />}
                        {productData.chassis_number && <SummaryDetail label="Chassis" value={productData.chassis_number} />}
                        {productData.engine_number && <SummaryDetail label="Engine" value={productData.engine_number} />}
                        {productData.ncb_percent && <SummaryDetail label="NCB" value={`${productData.ncb_percent}%`} />}
                        {productData.idv_vehicle && <SummaryDetail label="IDV" value={`₹${productData.idv_vehicle}`} />}
                      </>
                    )}
                    
                    {/* Life-specific details */}
                    {selection.category === 'life' && (
                      <>
                        {productData.plan_name && <SummaryDetail label="Plan" value={productData.plan_name} />}
                        {productData.policy_term && <SummaryDetail label="Term" value={`${productData.policy_term} years`} />}
                        {productData.risk_start_date && <SummaryDetail label="Risk Start" value={productData.risk_start_date} />}
                      </>
                    )}
                    
                    {/* Health-specific details */}
                    {selection.category === 'health' && (
                      <>
                        {productData.plan_name && <SummaryDetail label="Plan" value={productData.plan_name} />}
                        {productData.family_members && <SummaryDetail label="Members" value={productData.family_members} />}
                      </>
                    )}
                 </div>
             </div>
          </div>
        </div>

        {/* Workflow Implications */}
        <div className="p-8 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 space-y-4">
           <h5 className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-600 flex items-center gap-2">
              <Zap className="h-3 w-3" /> System Implications
           </h5>
           <ul className="space-y-2">
              <ImplicationItem text="Business Case #BC-AUTO will be created" />
              <ImplicationItem text="Digital Document Vault linked for OCR Verification" />
              <ImplicationItem text="Compliance triggers initialized for Permit/Fitness" />
           </ul>
        </div>

        <div className="flex flex-col items-center gap-4">
          <Button 
            className="h-20 w-full rounded-[2.5rem] bg-primary text-2xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all group"
            onClick={onComplete}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                Execute Workflow <ArrowRight className="ml-4 h-8 w-8 group-hover:translate-x-2 transition-transform" />
              </>
            )}
          </Button>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
             Compliance Audit ID: {complianceAuditId}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryDetail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center text-[10px]">
      <span className="font-bold text-muted-foreground uppercase opacity-70 tracking-tighter">{label}</span>
      <span className="font-black text-foreground uppercase">{value}</span>
    </div>
  );
}

function SummaryBadge({ label }: { label: string | number }) {
  return (
    <span className="px-2 py-1 rounded-lg bg-background/50 border border-border text-[9px] font-black uppercase tracking-tighter shadow-sm text-foreground/70">
      {label}
    </span>
  );
}

function ImplicationItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 text-[10px] font-bold text-amber-900/70">
       <div className="h-1 w-1 rounded-full bg-amber-500" />
       {text}
    </li>
  );
}
