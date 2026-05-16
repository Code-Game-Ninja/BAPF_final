"use client";

import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Car, 
  LifeBuoy, 
  Users2, 
  Building2, 
  ArrowRight,
  Plus,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { pageTransition } from "@/lib/helpers/animations";
import { IntakeProductData } from "@/lib/types/intake";
import { LucideIcon } from "lucide-react";

interface Props {
  category: string | null;
  data: IntakeProductData;
  onChange: (data: IntakeProductData) => void;
  onNext: () => void;
}

export function ProductForm({ category, data, onChange, onNext }: Props) {
  const updatePartial = (updates: Partial<IntakeProductData>) => {
    onChange({ ...data, ...updates });
  };

  return (
    <motion.div {...pageTransition} className="max-w-4xl mx-auto space-y-12 pb-20">
      {category === 'motor' && <MotorFields data={data} onChange={updatePartial} />}
      {category === 'life' && <LifeFields data={data} onChange={updatePartial} />}
      {category === 'health' && <HealthFields data={data} onChange={updatePartial} />}
      {category === 'commercial' && <CommercialFields data={data} onChange={updatePartial} />}

      <div className="flex items-center justify-center pt-10 border-t border-border/50">
        <Button 
          className="h-16 w-full md:w-auto md:min-w-[400px] rounded-[2rem] bg-primary text-xl font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
          onClick={onNext}
        >
          Final Review & Submit <ArrowRight className="ml-3 h-6 w-6" />
        </Button>
      </div>
    </motion.div>
  );
}

interface SectionProps {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, children }: SectionProps) {
  return (
    <div className="space-y-6">
      <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h4>
      <div className="bg-card/40 rounded-[2.5rem] border-2 border-border p-10 space-y-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string | number | undefined;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  grid?: string;
}

function Field({ label, value, onChange, placeholder, type = "text", grid = "col-span-1" }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", grid)}>
      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-1">{label}</label>
      <Input 
        type={type}
        placeholder={placeholder}
        className="h-12 rounded-xl border-2 focus:border-primary/50 transition-all font-bold"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

interface CategoryFieldsProps {
  data: IntakeProductData;
  onChange: (updates: Partial<IntakeProductData>) => void;
}

function MotorFields({ data, onChange }: CategoryFieldsProps) {
  const addons = data.addons || {};

  return (
    <div className="space-y-12">
      <Section title="Vehicle Identity & Specs" icon={Car}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field label="Registration No." value={data.reg_number} onChange={(v: string) => onChange({reg_number: v.toUpperCase()})} placeholder="MH-XX-XX-XXXX" />
          <Field label="Reg Type" value={data.registration_type} onChange={(v: string) => onChange({registration_type: v})} placeholder="Private / Commercial" />
          <Field label="Financed By" value={data.financed_by} onChange={(v: string) => onChange({financed_by: v})} placeholder="Bank / Financier" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Field label="Make" value={data.make} onChange={(v: string) => onChange({make: v})} />
          <Field label="Model" value={data.model} onChange={(v: string) => onChange({model: v})} />
          <Field label="Variant" value={data.variant} onChange={(v: string) => onChange({variant: v})} />
          <Field label="Fuel" value={data.fuel_type} onChange={(v: string) => onChange({fuel_type: v})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
          <Field label="Chassis No." value={data.chassis_number} onChange={(v: string) => onChange({chassis_number: v.toUpperCase()})} />
          <Field label="Engine No." value={data.engine_number} onChange={(v: string) => onChange({engine_number: v.toUpperCase()})} />
          <Field label="Seating" type="number" value={data.seating_capacity} onChange={(v: string) => onChange({seating_capacity: v})} />
          <Field label="Tyres" type="number" value={data.tyre_count} onChange={(v: string) => onChange({tyre_count: v})} />
        </div>
      </Section>

      <Section title="Compliance & Validity Dates" icon={Info}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Field label="RC Expiry" type="date" value={data.rc_expiry} onChange={(v: string) => onChange({rc_expiry: v})} />
          <Field label="Fitness Exp" type="date" value={data.fitness_expiry} onChange={(v: string) => onChange({fitness_expiry: v})} />
          <Field label="PUC Expiry" type="date" value={data.puc_expiry} onChange={(v: string) => onChange({puc_expiry: v})} />
          <Field label="Permit Exp" type="date" value={data.permit_expiry} onChange={(v: string) => onChange({permit_expiry: v})} />
        </div>
      </Section>

      <Section title="Financial Depth & IDV" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Field label="IDV (Vehicle)" type="number" value={data.idv_vehicle} onChange={(v: string) => onChange({idv_vehicle: v})} />
          <Field label="IDV (CNG/Kit)" type="number" value={data.idv_cng} onChange={(v: string) => onChange({idv_cng: v})} />
          <Field label="ND Prep (%)" type="number" value={data.ncb_percent} onChange={(v: string) => onChange({ncb_percent: v})} />
          <Field label="Net Premium" type="number" value={data.net_premium} onChange={(v: string) => onChange({net_premium: v})} />
        </div>
      </Section>

      <Section title="Coverage & Selectors" icon={ShieldCheck}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: 'zero_dep', label: 'Zero Dep' },
            { id: 'rti', label: 'RTI (Invoice)' },
            { id: 'rsa', label: 'RSA' },
            { id: 'engine_protector', label: 'Engine Prot.' },
            { id: 'key_replacement', label: 'Key Replacement' },
            { id: 'consumables', label: 'Consumables' },
            { id: 'pa_owner_driver', label: 'PA Owner-Driver' },
            { id: 'paid_driver', label: 'Paid Driver' },
          ].map((addon) => (
            <div key={addon.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer select-none"
                 onClick={() => onChange({ addons: { ...addons, [addon.id]: !addons[addon.id] } })}>
              <div className={cn(
                "h-4 w-4 rounded border-2 transition-all flex items-center justify-center",
                addons[addon.id] ? "bg-primary border-primary" : "bg-card border-border"
              )}>
                {addons[addon.id] && <Plus className="h-3 w-3 text-white" />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-tighter">{addon.label}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function LifeFields({ data, onChange }: CategoryFieldsProps) {
  return (
    <div className="space-y-12">
      <Section title="Plan Configuration" icon={LifeBuoy}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Plan Name" value={data.plan_name} onChange={(v: string) => onChange({plan_name: v})} />
          <Field label="Sum Assured" type="number" value={data.sum_assured} onChange={(v: string) => onChange({sum_assured: v})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field label="Policy Term" type="number" value={data.policy_term} onChange={(v: string) => onChange({policy_term: v})} />
          <Field label="Payment Term" type="number" value={data.premium_payment_term} onChange={(v: string) => onChange({premium_payment_term: v})} />
          <Field label="Frequency" value={data.payment_frequency} onChange={(v: string) => onChange({payment_frequency: v})} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <Field label="Risk Start Date" type="date" value={data.risk_start_date} onChange={(v: string) => onChange({risk_start_date: v})} />
          <Field label="Policy Date" type="date" value={data.policy_date} onChange={(v: string) => onChange({policy_date: v})} />
          <Field label="Next Due Date" type="date" value={data.next_due_date} onChange={(v: string) => onChange({next_due_date: v})} />
        </div>
      </Section>

      <Section title="Banking & Payouts" icon={Building2}>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Field label="Bank Name" value={data.bank_name} onChange={(v: string) => onChange({bank_name: v})} />
            <Field label="A/C Number" value={data.acc_number} onChange={(v: string) => onChange({acc_number: v})} />
            <Field label="IFSC Code" value={data.ifsc_code} onChange={(v: string) => onChange({ifsc_code: v})} />
         </div>
      </Section>

      <Section title="Nominee Management" icon={Users2}>
        <div className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
              <Field label="Nominee Name" value={data.nominee_name} onChange={(v: string) => onChange({nominee_name: v})} grid="md:col-span-2" />
              <Field label="Relationship" value={data.nominee_relation} onChange={(v: string) => onChange({nominee_relation: v})} />
              <Field label="Share (%)" value="100" onChange={() => {}} />
           </div>
        </div>
      </Section>
    </div>
  );
}

function HealthFields({ data, onChange }: CategoryFieldsProps) {
  return (
    <div className="space-y-12">
      <Section title="Coverage Scope" icon={ShieldCheck}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Field label="Policy Type" placeholder="Individual / Floater" value={data.health_policy_type} onChange={(v: string) => onChange({health_policy_type: v})} />
          <Field label="Plan Name" value={data.plan_name} onChange={(v: string) => onChange({plan_name: v})} />
          <Field label="Sum Insured" type="number" value={data.sum_assured} onChange={(v: string) => onChange({sum_assured: v})} />
        </div>
      </Section>

      <Section title="Insured Members" icon={Users2}>
        <div className="space-y-4">
          {(data.members || [{ name: "" }]).map((member, idx) => (
            <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
              <Field 
                label="Member Name" 
                value={member.name} 
                onChange={(v) => {
                  const newMembers = [...(data.members || [])];
                  if (!newMembers[idx]) newMembers[idx] = { name: "" };
                  newMembers[idx].name = v;
                  onChange({ members: newMembers });
                }} 
                grid="md:col-span-2" 
              />
              <Field 
                label="Relation" 
                value={member.relation} 
                onChange={(v) => {
                  const newMembers = [...(data.members || [])];
                  newMembers[idx].relation = v;
                  onChange({ members: newMembers });
                }} 
              />
              <Field 
                label="DOB / Age" 
                value={member.dob || member.age} 
                onChange={(v) => {
                  const newMembers = [...(data.members || [])];
                  newMembers[idx].age = v;
                  onChange({ members: newMembers });
                }} 
              />
            </div>
          ))}
          <Button 
            variant="outline" 
            className="w-full rounded-xl border-dashed py-6"
            onClick={() => onChange({ members: [...(data.members || []), { name: "" }] })}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Member
          </Button>
        </div>
      </Section>
    </div>
  );
}

function CommercialFields({ data, onChange }: CategoryFieldsProps) {
  return (
    <Section title="Asset Risk Profile" icon={Building2}>
      <div className="space-y-6">
        <Field label="Risk Description" placeholder="Detailed profile of the commercial risk" value={data.risk_details} onChange={(v: string) => onChange({risk_details: v})} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Occupancy" value={data.occupancy} onChange={(v: string) => onChange({occupancy: v})} />
          <Field label="Fire/Terrorism Sum Insured" type="number" value={data.fire_si} onChange={(v: string) => onChange({fire_si: v})} />
        </div>
      </div>
    </Section>
  );
}

