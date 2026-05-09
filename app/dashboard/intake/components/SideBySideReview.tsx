"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  Car, 
  RefreshCcw,
  Zap,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { IntakeProductData } from "@/lib/types/intake";

interface Props {
  file: File | null;
  extractedData: IntakeProductData;
  onConfirm: (data: IntakeProductData) => void;
  onReplay: () => void;
  category: string | null;
}

/**
 * Validate that a string looks like a real person/company name.
 * Rejects policy clause text, long sentences, and other garbage.
 */
function isValidName(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim();
  if (v.length < 2 || v.length > 100) return false;
  // Reject if it looks like a sentence (contains common clause words)
  if (/\b(arising|liability|claims|perils|excess|deductible|subject|pursuant|herein|thereof|whereas|notwithstanding)\b/i.test(v)) return false;
  // Reject if it has too many lowercase words (names are usually ALL CAPS or Title Case)
  const words = v.split(/\s+/);
  if (words.length > 8) return false;
  return true;
}

/**
 * Validate that a string looks like a real policy number.
 */
function isValidPolicyNumber(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim();
  // Must have at least one digit and be between 4-40 chars
  return v.length >= 4 && v.length <= 40 && /\d/.test(v);
}

/**
 * Validate that a string looks like a real monetary amount.
 */
function isValidAmount(value: string | undefined | null): boolean {
  if (!value) return false;
  const num = parseFloat(value.replace(/,/g, ""));
  return !isNaN(num) && num > 0;
}

export function SideBySideReview({ file, extractedData, onConfirm, onReplay, category }: Props) {
  const [formData, setFormData] = useState<IntakeProductData>(extractedData);

  // Sync formData when extractedData changes (after async extraction)
  useEffect(() => {
    console.log('[SideBySideReview] extractedData updated:', extractedData);
    // Sanitize name — reject garbage values from Gemini hallucination
    const sanitized = { ...extractedData };
    if (!isValidName(sanitized.name)) {
      sanitized.name = "";
    }
    if (!isValidPolicyNumber(sanitized.policy_no)) {
      sanitized.policy_no = "";
    }
    setFormData(sanitized);
  }, [extractedData]);

  const fileUrl = file ? URL.createObjectURL(file) : null;
  const isImage = file?.type.startsWith("image/");

  const handleFieldChange = (key: keyof IntakeProductData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Determine confidence based on whether the field actually has a value
  const fieldConfidence = (value: string | undefined | null, validator?: (v: string | undefined | null) => boolean): number => {
    if (!value || value === "") return 0;
    if (validator && !validator(value)) return 0;
    return 90; // Has a value = high confidence
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-280px)] min-h-[600px]">
      {/* Left Pane: Document Preview */}
      <div className="w-full lg:w-1/2 bg-card/60 backdrop-blur-xl border-2 border-border rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest">{file?.name || "Source Document"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onReplay} className="text-[10px] font-black uppercase">
            <RefreshCcw className="h-3 w-3 mr-2" /> Re-scan
          </Button>
        </div>
        <div className="flex-1 bg-black/5 relative flex items-center justify-center p-8">
          {fileUrl ? (
            isImage ? (
              <img src={fileUrl} alt="Policy Scan" className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" />
            ) : (
              <iframe src={fileUrl} className="w-full h-full rounded-lg" title="Policy PDF" />
            )
          ) : (
            <div className="text-center space-y-4 opacity-30">
              <FileText className="h-16 w-16 mx-auto" />
              <p className="font-black uppercase tracking-tighter">Document visualization failed</p>
            </div>
          )}
          
          {/* OCR Highlight Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="absolute inset-0 bg-primary/5 pointer-events-none"
          />
        </div>
      </div>

      {/* Right Pane: Field Review */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6 overflow-y-auto pr-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5 fill-primary/20" />
            <h3 className="text-2xl font-black font-heading uppercase tracking-tight">AI Confidence Map</h3>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            Verify extracted values — empty fields were not found in the document.
          </p>
        </div>

        <div className="space-y-8 pb-10">

          {/* ── Section: Insured Identity ── */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
              <User className="h-3.5 w-3.5" /> Insured&apos;s Primary Details
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <ReviewField
                label="Full Name / Company"
                value={formData.name}
                onChange={(v) => handleFieldChange("name", v)}
                confidence={fieldConfidence(formData.name, isValidName)}
                placeholder="Enter insured name"
              />
              <div className="grid grid-cols-2 gap-4">
                <ReviewField
                  label="Mobile Number"
                  value={formData.phone}
                  onChange={(v) => handleFieldChange("phone", v)}
                  confidence={fieldConfidence(formData.phone)}
                  placeholder="10-digit mobile"
                />
                <ReviewField
                  label="Email"
                  value={formData.email}
                  onChange={(v) => handleFieldChange("email", v)}
                  confidence={fieldConfidence(formData.email)}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* ── Section: Policy Core ── */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Policy Schedule
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <ReviewField
                label="Policy Number"
                value={formData.policy_no}
                onChange={(v) => handleFieldChange("policy_no", v)}
                confidence={fieldConfidence(formData.policy_no, isValidPolicyNumber)}
                placeholder="e.g. OG-26-1302-1801-00002652"
                isUppercase
              />
              <div className="grid grid-cols-2 gap-4">
                <ReviewField
                  label="Sum Insured / Assured"
                  value={formData.sum_assured}
                  onChange={(v) => handleFieldChange("sum_assured", v)}
                  confidence={fieldConfidence(formData.sum_assured, isValidAmount)}
                  placeholder="e.g. 5000000"
                />
                <ReviewField
                  label="Premium Amount"
                  value={formData.premium}
                  onChange={(v) => handleFieldChange("premium", v)}
                  confidence={fieldConfidence(formData.premium, isValidAmount)}
                  placeholder="e.g. 42500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ReviewField
                  label="Start Date"
                  value={formData.start_date}
                  onChange={(v) => handleFieldChange("start_date", v)}
                  confidence={fieldConfidence(formData.start_date)}
                  placeholder="YYYY-MM-DD"
                />
                <ReviewField
                  label="End Date"
                  value={formData.end_date}
                  onChange={(v) => handleFieldChange("end_date", v)}
                  confidence={fieldConfidence(formData.end_date)}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <ReviewField
                label="Insurer Name"
                value={formData.insurer}
                onChange={(v) => handleFieldChange("insurer", v)}
                confidence={fieldConfidence(formData.insurer)}
                placeholder="e.g. Bajaj Allianz"
              />
            </div>
          </div>

          {/* ── Section: Motor-specific ── */}
          {category === 'motor' && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                <Car className="h-3.5 w-3.5" /> Vehicle Details
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <ReviewField
                  label="Registration Number"
                  value={formData.reg_number}
                  onChange={(v) => handleFieldChange("reg_number", v)}
                  confidence={fieldConfidence(formData.reg_number)}
                  placeholder="MH-XX-XX-XXXX"
                  isUppercase
                />
                <div className="grid grid-cols-2 gap-4">
                  <ReviewField label="Make" value={formData.make} onChange={(v) => handleFieldChange("make", v)} confidence={fieldConfidence(formData.make)} placeholder="e.g. Maruti" />
                  <ReviewField label="Model" value={formData.model} onChange={(v) => handleFieldChange("model", v)} confidence={fieldConfidence(formData.model)} placeholder="e.g. Swift" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <ReviewField label="Mfg Year" value={formData.mfg_year} onChange={(v) => handleFieldChange("mfg_year", v)} confidence={fieldConfidence(formData.mfg_year)} placeholder="e.g. 2022" />
                  <ReviewField label="CC / GVW" value={formData.cc} onChange={(v) => handleFieldChange("cc", v)} confidence={fieldConfidence(formData.cc)} placeholder="e.g. 1197" />
                  <ReviewField label="NCB (%)" value={formData.ncb_percent} onChange={(v) => handleFieldChange("ncb_percent", v)} confidence={fieldConfidence(formData.ncb_percent)} placeholder="e.g. 20" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ReviewField label="Chassis No." value={formData.chassis_number} onChange={(v) => handleFieldChange("chassis_number", v)} confidence={fieldConfidence(formData.chassis_number)} placeholder="Chassis number" isUppercase />
                  <ReviewField label="Engine No." value={formData.engine_number} onChange={(v) => handleFieldChange("engine_number", v)} confidence={fieldConfidence(formData.engine_number)} placeholder="Engine number" isUppercase />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ReviewField label="IDV (Vehicle)" value={formData.idv_vehicle} onChange={(v) => handleFieldChange("idv_vehicle", v)} confidence={fieldConfidence(formData.idv_vehicle, isValidAmount)} placeholder="e.g. 500000" />
                  <ReviewField label="Net Premium" value={formData.net_premium} onChange={(v) => handleFieldChange("net_premium", v)} confidence={fieldConfidence(formData.net_premium, isValidAmount)} placeholder="e.g. 12000" />
                </div>
              </div>
            </div>
          )}

          {/* ── Section: Life-specific ── */}
          {category === 'life' && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Life Policy Details
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <ReviewField label="Plan Name" value={formData.plan_name} onChange={(v) => handleFieldChange("plan_name", v)} confidence={fieldConfidence(formData.plan_name)} placeholder="e.g. Jeevan Anand" />
                <div className="grid grid-cols-2 gap-4">
                  <ReviewField label="Policy Term (yrs)" value={formData.policy_term} onChange={(v) => handleFieldChange("policy_term", v)} confidence={fieldConfidence(formData.policy_term)} placeholder="e.g. 20" />
                  <ReviewField label="Payment Term (yrs)" value={formData.premium_payment_term} onChange={(v) => handleFieldChange("premium_payment_term", v)} confidence={fieldConfidence(formData.premium_payment_term)} placeholder="e.g. 15" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <ReviewField label="Nominee Name" value={formData.nominee_name} onChange={(v) => handleFieldChange("nominee_name", v)} confidence={fieldConfidence(formData.nominee_name)} placeholder="Nominee full name" />
                  <ReviewField label="Relation" value={formData.nominee_relation} onChange={(v) => handleFieldChange("nominee_relation", v)} confidence={fieldConfidence(formData.nominee_relation)} placeholder="e.g. Spouse" />
                </div>
              </div>
            </div>
          )}

          {/* ── Section: Health-specific ── */}
          {category === 'health' && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Health Policy Details
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <ReviewField label="Plan Name" value={formData.plan_name} onChange={(v) => handleFieldChange("plan_name", v)} confidence={fieldConfidence(formData.plan_name)} placeholder="e.g. Star Comprehensive" />
                <ReviewField label="Policy Type" value={formData.health_policy_type} onChange={(v) => handleFieldChange("health_policy_type", v)} confidence={fieldConfidence(formData.health_policy_type)} placeholder="Individual / Floater" />
              </div>
            </div>
          )}

          {/* ── Section: Commercial-specific ── */}
          {(category === 'commercial' || category === 'car_ear' || category === 'marine' || category === 'fire') && (
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" /> Risk Details
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <ReviewField label="Risk / Project Description" value={formData.risk_details} onChange={(v) => handleFieldChange("risk_details", v)} confidence={fieldConfidence(formData.risk_details)} placeholder="Describe the insured risk or project" />
                <div className="grid grid-cols-2 gap-4">
                  <ReviewField label="Occupancy / Project Name" value={formData.occupancy || formData.project_name} onChange={(v) => handleFieldChange("occupancy", v)} confidence={fieldConfidence(formData.occupancy || formData.project_name)} placeholder="e.g. Residential Building" />
                  <ReviewField label="Fire / Project SI" value={formData.fire_si} onChange={(v) => handleFieldChange("fire_si", v)} confidence={fieldConfidence(formData.fire_si, isValidAmount)} placeholder="e.g. 10000000" />
                </div>
              </div>
            </div>
          )}

          {/* Final Actions */}
          <div className="pt-6">
            <Button 
              className="h-16 w-full rounded-[2rem] bg-primary text-xl font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all"
              onClick={() => onConfirm(formData)}
            >
              Confirm & Continue <ArrowRight className="ml-3 h-6 w-6" />
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest opacity-60">
              Data will be mapped to a fresh business case
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ReviewFieldProps {
  label: string;
  value: string | undefined | null;
  onChange: (v: string) => void;
  confidence: number;
  isUppercase?: boolean;
  placeholder?: string;
}

function ReviewField({ label, value, onChange, confidence, isUppercase = false, placeholder }: ReviewFieldProps) {
  const hasValue = !!value && value !== "";
  const isLowConfidence = confidence < 50;

  return (
    <div className="space-y-1.5 group">
      <div className="flex justify-between items-center px-1">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground group-focus-within:text-primary transition-colors">
          {label}
        </label>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[8px] font-black uppercase",
          !hasValue
            ? "border-rose-500/30 bg-rose-500/5 text-rose-500"
            : isLowConfidence
              ? "border-amber-500/30 bg-amber-500/5 text-amber-600"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-600"
        )}>
          {!hasValue ? (
            <><AlertCircle className="h-2.5 w-2.5" /> Not found</>
          ) : (
            <><CheckCircle2 className="h-2.5 w-2.5" /> Extracted</>
          )}
        </div>
      </div>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(isUppercase ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-14 rounded-2xl border-2 bg-card/40 font-bold transition-all focus:ring-primary/20",
          !hasValue
            ? "border-rose-500/20 focus:border-rose-500/50 placeholder:text-rose-400/50"
            : "border-border focus:border-primary/50",
          isUppercase && "uppercase"
        )}
      />
    </div>
  );
}
