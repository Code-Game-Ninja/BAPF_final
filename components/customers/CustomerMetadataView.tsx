"use client";

import { Customer, IndividualEntityMetadata, CorporateEntityMetadata } from "@/lib/types";
import { 
  User, 
  Building2, 
  Wallet, 
  Fingerprint, 
  Briefcase, 
  Calendar, 
  Gavel, 
  Users,
  Hash,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

import { useFamilyMembers } from "@/lib/hooks/use-customers";

// Calculate relationship score based on real customer data
function calculateRelationshipScore(
  customer: Customer,
  familyMembers: Customer[]
): { score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 5.0; // Base score

  // KYC completeness (max +2 points)
  const hasPAN = (customer.entity_meta as any)?.pan_number;
  const hasAadhaar = (customer.entity_meta as any)?.aadhaar_number;
  if (hasPAN) { score += 0.5; factors.push("PAN verified"); }
  if (hasAadhaar) { score += 0.5; factors.push("Aadhaar linked"); }

  // Family/multi-policy bonus (max +1.5 points)
  if (familyMembers.length > 0) {
    score += Math.min(familyMembers.length * 0.5, 1.5);
    factors.push(`${familyMembers.length + 1} household members`);
  }

  // Contact completeness (max +1 point)
  if (customer.email) { score += 0.3; factors.push("Email available"); }
  if (customer.phone) { score += 0.3; factors.push("Phone verified"); }
  if (customer.address) { score += 0.4; factors.push("Address on file"); }

  // Account age bonus (max +0.5 points)
  const accountAge = customer.createdAt 
    ? Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;
  if (accountAge > 12) { score += 0.5; factors.push("Long-term client"); }
  else if (accountAge > 6) { score += 0.3; factors.push("Established client"); }

  // Cap at 10
  score = Math.min(score, 10);
  
  return { score: Math.round(score * 10) / 10, factors };
}

interface RelationshipScoreCardProps {
  customer: Customer;
  familyMembers: Customer[];
}

function RelationshipScoreCard({ customer, familyMembers }: RelationshipScoreCardProps) {
  const { score, factors } = calculateRelationshipScore(customer, familyMembers);
  const percentage = Math.round((score / 10) * 100);

  // Determine color based on score
  const getColor = () => {
    if (score >= 8) return "bg-emerald-500";
    if (score >= 6) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" /> Relationship Score
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-4">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black text-foreground">{score}</span>
          <span className="text-xs text-muted-foreground font-bold mb-1">/ 10</span>
        </div>
        <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
          <div className={cn("h-full transition-all duration-500", getColor())} style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-relaxed">
          {factors.length > 0 
            ? `Based on: ${factors.join(", ")}.`
            : "Complete profile to improve score."}
        </p>
      </CardContent>
    </Card>
  );
}

interface CustomerMetadataViewProps {
  customer: Customer;
}

export function CustomerMetadataView({ customer }: CustomerMetadataViewProps) {
  const isIndividual = customer.type === "individual";
  const isCorporate = customer.type === "corporate";
  const meta = customer.entity_meta;
  const { data: familyMembers } = useFamilyMembers(customer.family_id || null);

  if (!meta) return null;

  const filteredFamily = (familyMembers || []).filter(m => m.id !== customer.id);

  return (
    <div className="space-y-6">
      {/* 1. Entity Specific Depth */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <div className={cn(
          "h-1.5 w-full",
          isIndividual ? "bg-primary" : "bg-amber-500"
        )} />
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            {isIndividual ? <User className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-amber-500" />}
            {isIndividual ? "Profile Forensics" : "Corporate Intelligence"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 py-4">
          {isIndividual ? (
            <IndividualGrid meta={meta as IndividualEntityMetadata} />
          ) : (
            <CorporateGrid meta={meta as CorporateEntityMetadata} />
          )}

          <Separator className="bg-border/40" />

          {/* Identity & Legal Tokens */}
          <div className="space-y-3">
             <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Verification Tokens</p>
             <div className="flex flex-wrap gap-3">
                <TokenBox 
                  icon={Fingerprint} 
                  label="PAN" 
                  value={isIndividual ? (meta as IndividualEntityMetadata).pan_number : (meta as CorporateEntityMetadata).pan_number} 
                />
                {isCorporate && (
                  <TokenBox 
                    icon={Gavel} 
                    label="GSTIN" 
                    value={(meta as CorporateEntityMetadata).gst_number} 
                  />
                )}
                {isIndividual && (
                  <TokenBox 
                   icon={Hash} 
                   label="Aadhaar" 
                   value={(meta as IndividualEntityMetadata).aadhaar_number} 
                  />
                )}
             </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Portfolio Health / Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RelationshipScoreCard 
          customer={customer}
          familyMembers={filteredFamily}
        />

        {customer.family_id && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2 text-primary">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Users className="h-4 w-4" /> Household Tree
                </CardTitle>
                <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/30">
                  ID: {customer.family_id.split('-')[0]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="py-4 space-y-4">
               {filteredFamily.length > 0 ? (
                 <div className="space-y-3">
                   {filteredFamily.map(member => (
                     <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold leading-none">{member.name}</p>
                            <p className="text-[9px] text-muted-foreground font-black uppercase tracking-tighter mt-1">Cross-Sell Ready</p>
                          </div>
                        </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-6 opacity-40">
                    <p className="text-[10px] font-black uppercase tracking-widest">Solo Household</p>
                    <p className="text-[9px] font-bold mt-1">Add members for group policy benefits.</p>
                 </div>
               )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function IndividualGrid({ meta }: { meta: IndividualEntityMetadata }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetaField label="DOB" value={meta.dob} />
      <MetaField label="Gender" value={meta.gender} capitalize />
      <MetaField label="Occupation" value={meta.occupation} />
      <MetaField label="Income Slot" value={meta.annual_income} />
      <MetaField label="Marital Status" value={meta.marital_status} />
      <MetaField label="Anniversary" value={meta.anniversary_date} />
    </div>
  );
}

function CorporateGrid({ meta }: { meta: CorporateEntityMetadata }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetaField label="Industry" value={meta.industry_type} />
      <MetaField label="Incorporation" value={meta.incorporation_date} />
      <MetaField label="Revenue" value={meta.annual_revenue} />
      <MetaField label="Team Size" value={meta.employee_count?.toString()} />
      <MetaField label="POC Alt Phone" value={meta.poc_alt_phone} />
    </div>
  );
}

function MetaField({ label, value, capitalize }: { label: string; value?: string; capitalize?: boolean }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-wider mb-1 opacity-70">{label}</p>
      <p className={cn(
        "text-sm font-bold tracking-tight text-foreground/90",
        capitalize && "capitalize"
      )}>
        {value || "—"}
      </p>
    </div>
  );
}

function TokenBox({ icon: Icon, label, value }: { icon: any; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20 min-w-[140px]">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{label}</p>
        <p className="text-xs font-mono font-bold uppercase">{value || "NOT LINKED"}</p>
      </div>
    </div>
  );
}
