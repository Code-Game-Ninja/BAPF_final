"use client";

import { useState, useEffect } from "react";
import { mutate } from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  FilePlus2, 
  History, 
  Users2, 
  AlertCircle, 
  Upload, 
  FileCheck2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTransition } from "@/lib/helpers/animations";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/auth-context";
import { businessCaseService, customerService, policyService } from "@/lib/services";
import { Customer, Policy, BusinessCase, PolicyType } from "@/lib/types";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";
import { usePolicyCategoryStats } from "@/lib/hooks/use-dashboard";
import { IntakeProductData } from "@/lib/types/intake";

// Sub-components
import { CategorySelection } from "./components/CategorySelection";
import { ActionSelection } from "./components/ActionSelection";
import { CustomerSelection } from "./components/CustomerSelection";
import { OCRUpload } from "./components/OCRUpload";
import { SideBySideReview } from "./components/SideBySideReview";
import { ProductForm } from "./components/ProductForm";
import { FinalSummary } from "./components/FinalSummary";

interface ExtractionResult {
  text?: string;
  structuredData?: {
    policyDetails?: {
      policyNumber?: string;
      policyType?: string;
      insurerName?: string;
      premium?: number;
      sumInsured?: number;
      startDate?: string;
      endDate?: string;
      paymentFrequency?: string;
    };
    customerDetails?: {
      customerName?: string;
      customerPhone?: string;
      customerEmail?: string;
      customerAddress?: string;
      customerCity?: string;
      customerState?: string;
      customerPincode?: string;
    };
    motorDetails?: Record<string, unknown>;
    lifeDetails?: Record<string, unknown>;
    healthDetails?: Record<string, unknown>;
    commercialDetails?: Record<string, unknown>;
  };
}

/**
 * Validate that a string looks like a real person/company name.
 * Rejects policy clause text, long sentences, and other garbage from Gemini hallucination.
 */
function sanitizeName(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";
  const v = value.trim();
  if (v.length < 2 || v.length > 100) return "";
  // Reject if it looks like a policy clause sentence
  if (/\b(arising|liability|claims|perils|excess|deductible|subject|pursuant|herein|thereof|whereas|notwithstanding|third\s*party|acts\s*of\s*god)\b/i.test(v)) return "";
  // Reject if too many words (names are usually 1-6 words)
  if (v.split(/\s+/).length > 8) return "";
  return v;
}

/**
 * Detect policy type from raw extracted text using keyword matching.
 * Used as a fallback when Gemini AI extraction fails or returns wrong type.
 * Order matters — more specific types checked before generic ones.
 */
function detectPolicyTypeFromText(text: string): string | null {
  if (!text) return null;
  // Check specific types first to avoid false positives
  if (/marine|cargo|hull|inland\s*transit|open\s*policy.*transit/i.test(text)) return 'marine';
  if (/contractors?\s*all\s*risks?|erection\s*all\s*risks?|car\s*policy|ear\s*policy/i.test(text)) return 'car_ear';
  if (/surety\s*bond|bid\s*bond|performance\s*bond/i.test(text)) return 'surety_bond';
  if (/workmen\s*compensation|workers?\s*compensation/i.test(text)) return 'workmen_compensation';
  if (/burglary\s*(?:insurance|policy)/i.test(text)) return 'burglary';
  if (/(?:standard\s*)?fire\s*(?:insurance|policy)|fire\s*(?:&|and)\s*(?:special\s*)?perils?/i.test(text)) return 'fire';
  if (/motor\s*(?:insurance|policy|vehicle)|vehicle\s+insurance|private\s*car|two\s*wheeler|\btp\s*premium|\bod\s*premium/i.test(text)) return 'motor';
  if (/(?:general|public|product)\s*liability|professional\s*indemnity/i.test(text)) return 'liability';
  if (/life\s*insurance|term\s*plan|endowment|ulip|whole\s*life/i.test(text)) return 'life';
  if (/health\s*(?:insurance|policy)|mediclaim|hospitali[sz]ation/i.test(text)) return 'health';
  if (/travel\s*(?:insurance|policy)|overseas\s*(?:mediclaim|insurance)/i.test(text)) return 'travel';
  return null;
}

export default function IntakeDeskPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // -- Real-time policy category stats --
  const { data: categoryStats, isLoading: statsLoading } = usePolicyCategoryStats();
  
  // -- Wizard State --
  const [step, setStep] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // -- Data State --
  const [selection, setSelection] = useState({
    category: null as string | null,
    action: null as string | null,
  });
  const [customer, setCustomer] = useState<Customer | 'new' | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [productData, setProductData] = useState<IntakeProductData>({
    name: "", 
    phone: "",
    pan: "",
  });
  const [existingCaseId, setExistingCaseId] = useState<string | null>(null);

  // Read URL parameters from business case "Issue Policy" flow
  useEffect(() => {
    const category = searchParams.get('category');
    const action = searchParams.get('action');
    const customerId = searchParams.get('customer_id');
    const caseId = searchParams.get('case_id');
    const insurer = searchParams.get('insurer');
    const premium = searchParams.get('premium');

    logger.log('[Intake] URL params:', { category, action, customerId, caseId, insurer, premium });

    if (category || action) {
      setSelection({
        category: category || null,
        action: action || null,
      });

      if (insurer || premium) {
        setProductData((prev) => ({
          ...prev,
          insurer: insurer || prev.insurer,
          premium: premium || prev.premium,
        }));
      }

      if (customerId) {
        customerService.getById(customerId).then((cust) => {
          if (cust) {
            logger.log('[Intake] Loaded customer from URL:', cust.name);
            setCustomer(cust);
            setProductData((prev) => ({
              ...prev,
              name: cust.name,
              phone: cust.phone,
            }));
          } else {
            console.warn('[Intake] Customer not found:', customerId);
          }
        }).catch((err: unknown) => {
          console.error('[Intake] Failed to load customer:', err);
        });
      }

      if (caseId) {
        setExistingCaseId(caseId);
        logger.log('[Intake] Loading business case data:', caseId);
        businessCaseService.listCases().then((cases) => {
          const businessCase = cases.find(c => c.id === caseId);
          if (businessCase && businessCase.payload) {
            logger.log('[Intake] Found business case with payload:', businessCase.payload);
            const bcData = (businessCase.payload.product_data || businessCase.payload) as IntakeProductData;
            
            setProductData((prev) => ({
              ...prev,
              ...bcData,
              name: bcData.name || prev.name,
              phone: bcData.phone || prev.phone,
              email: bcData.email || prev.email,
            }));

            logger.log('[Intake] Skipping to final summary (step 6) - all data available from business case');
            setStep(6);
            toast.success('Business case data loaded - ready to issue policy');
            return;
          }
        }).catch((err: unknown) => {
          console.error('[Intake] Failed to load business case:', err);
        });
      } else {
        if (category && action && customerId) {
          logger.log('[Intake] Skipping to upload step (step 3)');
          setStep(3);
        }
      }
    }
  }, [searchParams]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => Math.max(0, s - 1));

  // -- Handlers --
  const mapPolicyTypeToCategory = (policyType: string, structuredData?: ExtractionResult['structuredData']): string => {
    const type = policyType?.toLowerCase() || '';
    if (type.includes('motor') || type.includes('car') || type.includes('vehicle') || type.includes('auto')) return 'motor';
    if (type.includes('health') || type.includes('medical') || type.includes('medicare')) return 'health';
    if (type.includes('life') || type.includes('term') || type.includes('endowment') || type.includes('ulip')) return 'life';
    if (type.includes('fire') || type.includes('marine') || type.includes('engineering') || type.includes('liability') || type.includes('burglary')) return 'commercial';

    if (structuredData) {
      const md = structuredData.motorDetails || {};
      const ld = structuredData.lifeDetails || {};
      const hd = structuredData.healthDetails || {};
      const comd = structuredData.commercialDetails || {};

      if (md.regNumber || md.chassisNumber || md.engineNumber || md.make) return 'motor';
      if (ld.nomineeName || ld.policyTerm || ld.sumAssured) return 'life';
      if (hd.healthPolicyType || hd.planName) return 'health';
      if (comd.riskDetails || comd.occupancy || comd.fireSi) return 'commercial';
    }
    return 'commercial';
  };

  const handleCategorySelect = (id: string) => {
    setSelection(prev => ({ ...prev, category: id }));
    nextStep();
  };

  const handleAutoDetect = () => {
    setStep(2);
  };

  const handleActionSelect = (id: string) => {
    setSelection(prev => ({ ...prev, action: id }));
    nextStep();
  };

  const handleCustomerSelect = (cust: Customer | 'new') => {
    setCustomer(cust);
     if (cust !== 'new') {
       setProductData((prev) => ({ ...prev, name: cust.name, phone: cust.phone }));
     }
    nextStep();
  };

  const handleUpload = async (file: File) => {
    setUploadedFile(file);
    setIsExtracting(true);
    
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError) throw sessionError;
      const activeSession = session ?? (await supabase.auth.getSession()).data.session;

      if (!activeSession) {
        toast.error("You must be signed in to extract document data.");
        setIsExtracting(false);
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || errData?.detail || `Extraction failed (${response.status})`);
      }

      const extractionResult = await response.json() as ExtractionResult;
      const structuredData = extractionResult.structuredData;
      const rawText = extractionResult.text || "";

      if (!structuredData && !rawText) {
        toast.warning("No structured data extracted. Please enter details manually.");
        setIsExtracting(false);
        nextStep();
        return;
      }

      const { extractPolicyDataFromFile } = await import('@/lib/helpers/pdf-extractor');
      const regexExtracted = await extractPolicyDataFromFile(file);

      const pd = {
        policyNumber: structuredData?.policyDetails?.policyNumber || regexExtracted.policyNumber,
        policyType: structuredData?.policyDetails?.policyType || regexExtracted.policyType,
        insurerName: structuredData?.policyDetails?.insurerName || regexExtracted.insurerName,
        premium: structuredData?.policyDetails?.premium ?? regexExtracted.premium,
        sumInsured: structuredData?.policyDetails?.sumInsured ?? regexExtracted.sumInsured,
        startDate: structuredData?.policyDetails?.startDate || regexExtracted.startDate,
        endDate: structuredData?.policyDetails?.endDate || regexExtracted.endDate,
        paymentFrequency: structuredData?.policyDetails?.paymentFrequency || regexExtracted.paymentFrequency,
      };
      const cd = {
        customerName: structuredData?.customerDetails?.customerName || regexExtracted.customerName,
        customerPhone: structuredData?.customerDetails?.customerPhone || regexExtracted.customerPhone,
        customerEmail: structuredData?.customerDetails?.customerEmail || regexExtracted.customerEmail,
        customerAddress: structuredData?.customerDetails?.customerAddress || regexExtracted.customerAddress,
        customerCity: structuredData?.customerDetails?.customerCity || regexExtracted.customerCity,
        customerState: structuredData?.customerDetails?.customerState || regexExtracted.customerState,
        customerPincode: structuredData?.customerDetails?.customerPincode || regexExtracted.customerPincode,
      };
      const md = (structuredData?.motorDetails || {}) as Record<string, any>;
      const ld = (structuredData?.lifeDetails || {}) as Record<string, any>;
      const hd = (structuredData?.healthDetails || {}) as Record<string, any>;
      const comd = (structuredData?.commercialDetails || {}) as Record<string, any>;

      const detectedPolicyType = pd.policyType || detectPolicyTypeFromText(rawText) || '';
      const detectedCategory = mapPolicyTypeToCategory(detectedPolicyType, structuredData);

      setSelection(prev => ({
        ...prev,
        category: detectedCategory,
        action: 'policy'
      }));

      setProductData((prev) => ({
        ...prev,
        policy_no: pd.policyNumber || prev.policy_no || "",
        premium: pd.premium ? pd.premium.toString() : prev.premium || "",
        sum_assured: pd.sumInsured ? pd.sumInsured.toString() : (hd.sumInsured ? hd.sumInsured.toString() : (ld.sumAssured ? ld.sumAssured.toString() : prev.sum_assured || "")),
        start_date: pd.startDate || prev.start_date || "",
        end_date: pd.endDate || prev.end_date || "",
        insurer: pd.insurerName || prev.insurer || "",
        payment_frequency: pd.paymentFrequency || ld.paymentFrequency || prev.payment_frequency || "",
        name: sanitizeName(cd.customerName) || prev.name || "",
        phone: cd.customerPhone || prev.phone || "",
        email: cd.customerEmail || prev.email || "",
        reg_number: md.regNumber || prev.reg_number || "",
        plan_name: ld.planName || hd.planName || prev.plan_name || "",
        risk_details: comd.riskDetails || prev.risk_details || "",
      }));

      nextStep();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to extract data");
      nextStep();
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSideBySideConfirm = (data: IntakeProductData) => {
    setProductData(data);
    nextStep();
  };

  const handleFinalExecution = async () => {
    if (!user) return;
    setIsExecuting(true);
    
    try {
      let finalCustomerId = (customer as Customer)?.id;

      if (customer === 'new' || !finalCustomerId) {
        const matches = await customerService.findMatchingCustomers(
          productData.name || "",
          productData.phone || "",
          productData.email || ""
        );

        if (matches && matches.length > 0) {
          finalCustomerId = matches[0].id;
        } else {
          const newCust = await customerService.createCustomer({
            name: productData.name || "Unknown",
            phone: productData.phone || "N/A",
            email: productData.email || "N/A",
            status: "active",
            type: "individual",
            entity_meta: { pan_number: productData.pan }
          }, user.id);
          finalCustomerId = newCust.id;
        }
      }

      if (!finalCustomerId) throw new Error("Invalid customer mapping");

      let policyId: string | undefined;
      try {
        const policyTypeMap: Record<string, string> = {
          'motor': 'motor',
          'health': 'health',
          'life': 'life',
          'commercial': 'fire',
        };
        const policyType = policyTypeMap[selection.category || ''] || 'other';
        
        let policyDocumentUrl: string | undefined;
        if (uploadedFile) {
          const timestamp = Date.now();
          const fileName = `${productData.policy_no || timestamp}_${uploadedFile.name}`;
          const storagePath = `policies/${finalCustomerId}/${fileName}`;
          
          const { data: { session } } = await supabase.auth.getSession();
          const authToken = session?.access_token;

          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({
              path: storagePath.replace(/[^a-zA-Z0-9.\-_/]/g, '_'),
              mimeType: uploadedFile.type || 'application/pdf',
              size: uploadedFile.size,
            }),
          });

          if (!uploadResponse.ok) throw new Error("Failed to get upload URL");

          const { uploadUrl, downloadUrl } = await uploadResponse.json() as { uploadUrl: string; downloadUrl: string };

          const fileUploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': uploadedFile.type, 'x-upsert': 'true' },
            body: uploadedFile,
          });

          if (!fileUploadResponse.ok) throw new Error("Failed to upload file");

          policyDocumentUrl = downloadUrl;
        }
        
        const policyPayload = {
          customer_id: finalCustomerId,
          customer_name: productData.name,
          policy_number: productData.policy_no || `TEMP-${Date.now()}`,
          policy_type: policyType as PolicyType,
          insurer_name: productData.insurer || 'Unknown',
          premium_amount: parseFloat(productData.premium || "0") || 0,
          sum_insured: parseFloat(productData.sum_assured || "0") || 0,
          start_date: productData.start_date || new Date().toISOString().split('T')[0],
          end_date: productData.end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'active' as const,
          assigned_to: user.id,
          created_by: user.id,
          lockedForEmployee: false,
          verification_confirmed: false,
          vehicle_number: selection.category === 'motor' ? productData.reg_number : undefined,
          pdf_url: policyDocumentUrl,
        };
        
        let existingPolicy = null;
        if (productData.policy_no) {
          const { data } = await supabase
            .from('policies')
            .select('id')
            .eq('policy_number', productData.policy_no)
            .maybeSingle();
          existingPolicy = data;
        } else {
          const { data } = await supabase
            .from('policies')
            .select('id, policy_number')
            .eq('customer_id', finalCustomerId)
            .eq('policy_type', policyType)
            .eq('insurer_name', policyPayload.insurer_name)
            .eq('start_date', policyPayload.start_date)
            .limit(1)
            .maybeSingle();
            
          if (data) {
            existingPolicy = data;
            policyPayload.policy_number = data.policy_number;
          }
        }

        if (existingPolicy) {
          await policyService.update(existingPolicy.id, policyPayload as Partial<Policy>);
          policyId = existingPolicy.id;
        } else {
          const policy = await policyService.create(policyPayload as Omit<Policy, 'id' | 'created_at' | 'updated_at'>);
          policyId = policy.id;
        }
      } catch (err: unknown) {
        console.error('[Intake] Policy creation/update failed:', err);
      }

      let caseIdToRoute = existingCaseId;

      if (existingCaseId) {
        await businessCaseService.updateCase(existingCaseId, { status: "won" });
      } else {
        const actionToCaseTypeMap: Record<string, string> = {
          'new_policy': 'policy',
          'renewal': 'renewal',
          'endorsement': 'endorsement',
          'claim': 'claim',
          'quote': 'quote',
          'service': 'servicing',
        };
        const caseType = actionToCaseTypeMap[selection.action || ''] || 'quote';
        
        const bCase = await businessCaseService.createCase({
           case_number: `BCS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
           customer_id: finalCustomerId,
           case_type: caseType as any,
           lob: (selection.category as any) || "other",
           status: "open",
           priority: "medium",
           payload: { 
             source: "unified_intake",
             metadata: selection,
             product_data: productData,
             motor_meta: selection.category === 'motor' ? {
               registration_number: productData.reg_number,
               make: productData.make,
               model: productData.model,
               chassis_number: productData.chassis_number,
               engine_number: productData.engine_number,
               ncb_percent: parseInt(productData.ncb_percent || "0") || 0,
               idv_vehicle: parseInt(productData.idv_vehicle || "0") || 0,
               addons: productData.addons || {}
             } : null,
             life_meta: selection.category === 'life' ? {
               plan_name: productData.plan_name,
               sum_assured: parseInt(productData.sum_assured || "0") || 0,
               policy_term: parseInt(productData.policy_term || "0") || 0,
               risk_start_date: productData.risk_start_date
             } : null,
             verification_needed: true
           },
           created_by: user.id
         });

        caseIdToRoute = bCase.id;
      }

      void mutate("business-cases");
      router.push(`/dashboard/business-cases/${caseIdToRoute}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto space-y-12 pb-20 pt-4"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      <div className="relative">
        {step > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={prevStep}
            className="absolute -left-12 top-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest"
          >
            <FilePlus2 className="h-3.5 w-3.5" />
            Unified Intake Desk • Step {step + 1} of 7
          </motion.div>
          <motion.h1 className="text-5xl font-bold tracking-tighter font-heading">
            {step === 0 && <>Select a <span className="text-primary italic">Product Line</span></>}
            {step === 1 && <>Choose the <span className="text-primary italic">Operation</span></>}
            {step === 2 && <>Map to a <span className="text-primary italic">Client Identity</span></>}
            {step === 3 && <>Upload <span className="text-primary italic">Source Document</span></>}
            {step === 4 && <>Verify <span className="text-primary italic">Extraction Result</span></>}
            {step === 5 && <>Capture <span className="text-primary italic">Product Specifics</span></>}
            {step === 6 && <>Final <span className="text-primary italic">Execution</span></>}
          </motion.h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step0" {...pageTransition} className="space-y-12">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Draft Intakes", icon: History },
                { label: "Recent Clients", icon: Users2 },
                { label: "Urgent Exp", icon: AlertCircle, urgent: true },
                { label: "Pending OCR", icon: Upload },
                { label: "IRDA Forms", icon: FileCheck2 },
              ].map((item) => (
                <div key={item.label} className={cn(
                  "flex items-center justify-between p-3 rounded-xl border border-border bg-card/40 hover:bg-card transition-all cursor-pointer group",
                  item.urgent && "border-rose-500/20 bg-rose-500/5"
                )}>
                  <div className="flex items-center gap-2">
                    <item.icon className={cn("h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors", item.urgent && "text-rose-500")} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <CategorySelection 
              onSelect={handleCategorySelect} 
              onAutoDetect={handleAutoDetect} 
              stats={categoryStats}
              isLoading={statsLoading}
            />
          </motion.div>
        )}

        {step === 1 && <ActionSelection onSelect={handleActionSelect} />}
        {step === 2 && <CustomerSelection onSelect={handleCustomerSelect} category={selection.category} action={selection.action} />}
        {step === 3 && (
          <OCRUpload 
            onUpload={handleUpload} 
            onSkip={() => nextStep()} 
            isExtracting={isExtracting} 
          />
        )}
        {step === 4 && (
          <SideBySideReview 
            file={uploadedFile} 
            extractedData={productData} 
            onConfirm={handleSideBySideConfirm} 
            onReplay={() => setStep(3)}
            category={selection.category || 'motor'}
          />
        )}
         {step === 5 && (
           <ProductForm 
             category={selection.category || 'motor'} 
             data={productData} 
             onChange={(data) => setProductData(data)}
             onNext={nextStep}
           />
         )}

         {step === 6 && (
           <FinalSummary 
             selection={selection} 
             customer={customer || 'new'} 
             productData={productData}
             isCreating={isExecuting}
             onComplete={handleFinalExecution}
           />
         )}
      </AnimatePresence>
    </motion.div>
  );
}
