"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileUp,
  PenLine,
  Loader2,
  Shield,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form } from "@/components/ui/form";

import { VerificationPopup } from "@/components/policies/verification-popup";
import { PolicyUploadZone } from "@/components/policies/policy-upload-zone";
import { CustomerSearchField } from "@/components/policies/customer-search-field";
import { PolicyDetailsGrid } from "@/components/policies/policy-details-grid";
import {
  policySchema,
  POLICY_TYPES,
  type PolicyFormData,
} from "@/lib/validations/policy";
import { policyService } from "@/lib/services/policy.service";
import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { documentService } from "@/lib/services/document.service";
import { extractPolicyDataFromFile, isSupportedFileType, type ExtractedPolicyData } from "@/lib/helpers/pdf-extractor";
import { compressFile } from "@/lib/helpers/compress-file";
import { getMaxFileSize } from "@/lib/helpers/storage";
import { getAccessToken } from "@/lib/services/auth.service";
import { useAuth } from "@/lib/context/auth-context";
import { invalidatePolicies } from "@/lib/hooks/use-policies";
import { invalidateCustomers } from "@/lib/hooks/use-customers";
import { invalidateDocuments } from "@/lib/hooks/use-documents";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { useActiveUsers } from "@/lib/hooks/use-settings";
import { friendlyError } from "@/lib/helpers/friendly-error";
import type { Policy, Customer, UserRole } from "@/lib/types";

// ---- Props ----

interface PolicyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editPolicy?: Policy | null;
  onSuccess?: () => void;
}

// ---- Component ----

export function PolicyForm({
  open,
  onOpenChange,
  editPolicy,
  onSuccess,
}: PolicyFormProps) {
  const { user, session } = useAuth();
  const isEmployee = user?.role === "employee";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";
  const isEdit = !!editPolicy;

  // Fetch campaigns and users for dropdowns (admin/manager only)
  const { data: campaigns } = useCampaigns();
  const { data: activeUsers } = useActiveUsers();

  // State
  const [mode, setMode] = useState<"manual" | "upload">(isEmployee ? "upload" : "manual");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPolicyData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [fuzzyMatches, setFuzzyMatches] = useState<Customer[]>([]);
  const [isAutoCreating, setIsAutoCreating] = useState(false);
  const [autoCreatedCustomer, setAutoCreatedCustomer] = useState<Customer | null>(null);

  // Form
  const form = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      policy_number: "",
      policy_type: undefined,
      customer_id: "",
      customer_name: "",
      start_date: "",
      end_date: "",
      premium_amount: 0,
      sum_insured: 0,
      insurer_name: "",
      payment_frequency: undefined,
      assigned_to: user?.uid || "",
      assigned_to_name: user?.name || "",
      remark: "",
      branch_id: user?.branch_id || "",
      campaign_id: "",
      motor_category: undefined,
      vehicle_number: "",
      vehicle_type: undefined,
      health_policy_type: undefined,
      plan_name: "",
      life_plan_type: undefined,
      risk_location: "",
      marine_policy_type: undefined,
      liability_type: undefined,
      policy_tenure: "",
      project_name: "",
      project_location: "",
      principal: "",
      surety_bond_type: undefined,
    },
  });

  // Pre-fill for edit mode
  useEffect(() => {
    if (editPolicy && open) {
      form.reset({
        policy_number: editPolicy.policy_number || "",
        policy_type: editPolicy.policy_type,
        customer_id: editPolicy.customer_id,
        customer_name: editPolicy.customer_name,
        start_date: editPolicy.start_date
          ? new Date(editPolicy.start_date).toISOString().split("T")[0]
          : "",
        end_date: editPolicy.end_date
          ? new Date(editPolicy.end_date).toISOString().split("T")[0]
          : "",
        premium_amount: editPolicy.premium_amount,
        sum_insured: editPolicy.sum_insured || 0,
        insurer_name: editPolicy.insurer_name || "",
        payment_frequency: editPolicy.payment_frequency,
        assigned_to: editPolicy.assigned_to,
        assigned_to_name: editPolicy.assigned_to_name || "",
        remark: editPolicy.remark || "",
        branch_id: editPolicy.branch_id || "",
        campaign_id: editPolicy.campaign_id || "",
        motor_category: editPolicy.motor_category || undefined,
        vehicle_number: editPolicy.vehicle_number || "",
        vehicle_type: editPolicy.vehicle_type as PolicyFormData["vehicle_type"] || undefined,
        health_policy_type: editPolicy.health_policy_type || undefined,
        plan_name: editPolicy.plan_name || "",
        life_plan_type: editPolicy.life_plan_type || undefined,
        risk_location: editPolicy.risk_location || "",
        marine_policy_type: editPolicy.marine_policy_type || undefined,
        liability_type: editPolicy.liability_type || undefined,
        policy_tenure: editPolicy.policy_tenure || "",
        project_name: editPolicy.project_name || "",
        project_location: editPolicy.project_location || "",
        principal: editPolicy.principal || "",
        surety_bond_type: editPolicy.surety_bond_type || undefined,
      });
    }
  }, [editPolicy, open, form]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      form.reset();
      setUploadedFile(null);
      setExtractedData(null);
      setSelectedCustomer(null);
      setCustomerResults([]);
      setFuzzyMatches([]);
      setUploadProgress(0);
      setAutoCreatedCustomer(null);
      setIsAutoCreating(false);
    }
  }, [open, form]);

  // ---- Document Extraction ----
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!isSupportedFileType(file.type)) {
        toast.error("Unsupported file type. Use PDF, JPG, PNG, WEBP, BMP, or TIFF.");
        return;
      }
      if (file.size > getMaxFileSize()) {
        const maxMB = getMaxFileSize() / (1024 * 1024);
        toast.error(`File too large. Maximum ${maxMB}MB`);
        return;
      }

      setIsExtracting(true);

      try {
        // Compress file and extract data in parallel (they are independent)
        const [compressed, data] = await Promise.all([
          compressFile(file),
          extractPolicyDataFromFile(file),
        ]);
        setUploadedFile(compressed);
        setExtractedData(data);

        // Auto-fill form
        if (data.policyNumber) {
          form.setValue("policy_number", data.policyNumber);
        }
        if (data.policyType) {
          const typeMatch = POLICY_TYPES.find(
            (t) => t.value === data.policyType
          );
          if (typeMatch) {
            form.setValue("policy_type", typeMatch.value as PolicyFormData["policy_type"]);
          }
        }
        if (data.premium) {
          form.setValue("premium_amount", data.premium);
        }
        if (data.startDate) {
          form.setValue("start_date", data.startDate);
        }
        if (data.endDate) {
          form.setValue("end_date", data.endDate);
        }
        if (data.insurerName) {
          form.setValue("insurer_name", data.insurerName);
        }
        if (data.sumInsured) {
          form.setValue("sum_insured", data.sumInsured);
        }
        if (data.customerName) {
          form.setValue("customer_name", data.customerName);
        }
        if (data.paymentFrequency) {
          form.setValue("payment_frequency", data.paymentFrequency as PolicyFormData["payment_frequency"]);
        }

        // Auto-fill policy-type-specific fields
        if (data.motorCategory) form.setValue("motor_category", data.motorCategory as PolicyFormData["motor_category"]);
        if (data.vehicleNumber) form.setValue("vehicle_number", data.vehicleNumber);
        if (data.vehicleType) form.setValue("vehicle_type", data.vehicleType as PolicyFormData["vehicle_type"]);
        if (data.healthPolicyType) form.setValue("health_policy_type", data.healthPolicyType as PolicyFormData["health_policy_type"]);
        if (data.planName) form.setValue("plan_name", data.planName);
        if (data.lifePlanType) form.setValue("life_plan_type", data.lifePlanType as PolicyFormData["life_plan_type"]);
        if (data.riskLocation) form.setValue("risk_location", data.riskLocation);
        if (data.marinePolicyType) form.setValue("marine_policy_type", data.marinePolicyType as PolicyFormData["marine_policy_type"]);
        if (data.liabilityType) form.setValue("liability_type", data.liabilityType as PolicyFormData["liability_type"]);
        if (data.policyTenure) form.setValue("policy_tenure", data.policyTenure);
        if (data.projectName) form.setValue("project_name", data.projectName);
        if (data.projectLocation) form.setValue("project_location", data.projectLocation);
        if (data.principal) form.setValue("principal", data.principal);
        if (data.suretyBondType) form.setValue("surety_bond_type", data.suretyBondType as PolicyFormData["surety_bond_type"]);

        // Fuzzy-match customer
        if (data.customerName || data.customerPhone || data.customerEmail) {
          try {
            const matches = await customerService.findMatchingCustomers(
              data.customerName || "",
              data.customerPhone || "",
              data.customerEmail || ""
            );
            if (matches.length > 0) {
              setFuzzyMatches(matches);
              // Auto-select first match if high confidence
              if (matches.length === 1) {
                selectCustomer(matches[0]);
              }
            }
          } catch {
            // Fuzzy match failed, not critical
          }
        }

        toast.success(
          `Document extracted with ${Math.round(data.confidence * 100)}% confidence`
        );
      } catch (err) {
        console.error("Document extraction error:", err);
        const message = err instanceof Error ? err.message : "";
        if (message.includes("not configured") || message.includes("503")) {
          toast.error("Document extraction service is not configured. Please fill the form manually.");
        } else {
          toast.error("Failed to extract data from document. Please fill manually.");
        }
      } finally {
        setIsExtracting(false);
      }
    },
    [form]
  );

  // ---- Customer Search ----
  const searchCustomers = useCallback(
    async (query: string) => {
      setCustomerSearchQuery(query);
      if (query.length < 2) {
        setCustomerResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const results = await customerService.searchByNameOrPhone(query);
        setCustomerResults(results.slice(0, 8));
      } catch {
        setCustomerResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    form.setValue("customer_id", customer.id!);
    form.setValue("customer_name", customer.name);
    setCustomerResults([]);
    setFuzzyMatches([]);
    setCustomerSearchQuery("");
  }

  // ---- Auto-Create Customer from Extracted Data ----
  const handleAutoCreateCustomer = useCallback(async () => {
    if (!extractedData || !user) return;

    setIsAutoCreating(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");

      const apiRes = await fetch("/api/customers/auto-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: extractedData.customerName || "Unknown Customer",
          phone: extractedData.customerPhone || "N/A",
          email: extractedData.customerEmail || "N/A",
          address: extractedData.customerAddress || undefined,
          city: extractedData.customerCity || undefined,
          state: extractedData.customerState || undefined,
          pincode: extractedData.customerPincode || undefined,
        }),
      });

      if (!apiRes.ok) {
        const errBody = await apiRes.json().catch(() => null);
        throw new Error(errBody?.error || "Failed to auto-create customer");
      }

      const result = await apiRes.json();
      const isNew = !result.found;
      const customer = result as Customer;

      // Set customer in form
      setSelectedCustomer(customer);
      setAutoCreatedCustomer(customer);
      form.setValue("customer_id", customer.id!);
      form.setValue("customer_name", customer.name);
      setFuzzyMatches([]);
      setCustomerSearchQuery("");

      // Invalidate customer cache so the new customer shows up everywhere
      invalidateCustomers();

      if (isNew) {
        toast.success(`Customer "${customer.name}" (${customer.uid}) created automatically from document`);
      } else {
        toast.info(`Existing customer "${customer.name}" (${customer.uid}) linked from document`);
      }
    } catch (err: unknown) {
      console.error("Auto-create customer error:", err);
      toast.error(friendlyError(err instanceof Error ? err : new Error(String(err)), "Failed to auto-create customer. Please add manually."));
    } finally {
      setIsAutoCreating(false);
    }
  }, [extractedData, user, form]);

  // ---- Submit ----
  async function onSubmit(data: PolicyFormData) {
    // For employees, show verification popup first
    if (isEmployee && !isEdit) {
      setShowVerification(true);
      return;
    }
    await savePolicy(data);
  }

  async function handleVerifiedSave() {
    const data = form.getValues();
    setShowVerification(false);
    await savePolicy(data);
  }

  async function savePolicy(data: PolicyFormData) {
    if (!user) return;
    setIsSubmitting(true);

    try {
      let pdfUrl: string | undefined;

      // Upload document if new
      if (uploadedFile && !isEdit) {
        setIsUploading(true);
        setUploadProgress(0);

        const token = await getAccessToken();
        if (!token) throw new Error("Not authenticated");

        const timestamp = Date.now();
        const safeName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `policies/${user!.uid}/${timestamp}_${safeName}`;

        const uploadInitRes = await fetch("/api/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            path: storagePath,
            mimeType: uploadedFile.type,
            size: uploadedFile.size,
          }),
        });

        if (!uploadInitRes.ok) {
          const err = await uploadInitRes.json().catch(() => ({ error: "Failed to initialize upload" }));
          throw new Error(err.error ?? "Failed to initialize upload");
        }

        const uploadInit = await uploadInitRes.json() as {
          uploadUrl: string;
          storagePath: string;
        };

        await new Promise<void>((resolve, reject) => {
          if (typeof XMLHttpRequest !== "undefined") {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", uploadInit.uploadUrl);
            xhr.setRequestHeader("Content-Type", uploadedFile.type || "application/octet-stream");
            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
            };
            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) { setUploadProgress(100); resolve(); }
              else reject(new Error(`Upload failed with status ${xhr.status}`));
            };
            xhr.onerror = () => reject(new Error("Upload failed due to a network error"));
            xhr.send(uploadedFile);
          } else {
            fetch(uploadInit.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": uploadedFile.type || "application/octet-stream" },
              body: uploadedFile,
            }).then((res) => {
              if (res.ok) { setUploadProgress(100); resolve(); }
              else reject(new Error(`Upload failed with status ${res.status}`));
            }).catch(reject);
          }
        });

        // Store the storage path — resolved to a signed URL on demand
        pdfUrl = uploadInit.storagePath;
        setIsUploading(false);
      }

      if (isEdit && editPolicy?.id) {
        // Update existing policy
        await policyService.update(editPolicy.id, {
          policy_type: data.policy_type,
          customer_id: data.customer_id,
          customer_name: data.customer_name,
          premium_amount: data.premium_amount,
          sum_insured: data.sum_insured || undefined,
          insurer_name: data.insurer_name || undefined,
          payment_frequency: data.payment_frequency || undefined,
          remark: data.remark || undefined,
          campaign_id: data.campaign_id || undefined,
          motor_category: data.motor_category || undefined,
          vehicle_number: data.vehicle_number || undefined,
          vehicle_type: data.vehicle_type || undefined,
          health_policy_type: data.health_policy_type || undefined,
          plan_name: data.plan_name || undefined,
          life_plan_type: data.life_plan_type || undefined,
          risk_location: data.risk_location || undefined,
          marine_policy_type: data.marine_policy_type || undefined,
          liability_type: data.liability_type || undefined,
          policy_tenure: data.policy_tenure || undefined,
          project_name: data.project_name || undefined,
          project_location: data.project_location || undefined,
          principal: data.principal || undefined,
          surety_bond_type: data.surety_bond_type || undefined,
          ...(isAdminOrManager ? {
            assigned_to: data.assigned_to,
            assigned_to_name: data.assigned_to_name || undefined,
          } : {}),
        });
        toast.success("Policy updated successfully");

        // Audit log: policy update
        auditLogService.logAction(
          user.uid, user.name || "", "update", "policies",
          `Updated policy ${editPolicy.id} (${data.policy_type}) for ${data.customer_name}`
        ).catch(() => {});
      } else {
        // Create new policy via server API (auto-generates policy_number if blank)
        const idToken = session?.access_token;
        const apiRes = await fetch("/api/policies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            policy_number: data.policy_number || "",
            policy_type: data.policy_type,
            customer_id: data.customer_id,
            customer_name: data.customer_name,
            start_date: data.start_date,
            end_date: data.end_date,
            premium_amount: data.premium_amount,
            sum_insured: data.sum_insured || undefined,
            insurer_name: data.insurer_name || undefined,
            payment_frequency: data.payment_frequency || undefined,
            assigned_to: data.assigned_to || user.uid,
            assigned_to_name: data.assigned_to_name || user.name || "",
            pdf_url: pdfUrl,
            remark: data.remark || undefined,
            branch_id: data.branch_id || user.branch_id || "",
            campaign_id: data.campaign_id || null,
            motor_category: data.motor_category || null,
            vehicle_number: data.vehicle_number || null,
            vehicle_type: data.vehicle_type || null,
            health_policy_type: data.health_policy_type || null,
            plan_name: data.plan_name || null,
            life_plan_type: data.life_plan_type || null,
            risk_location: data.risk_location || null,
            marine_policy_type: data.marine_policy_type || null,
            liability_type: data.liability_type || null,
            policy_tenure: data.policy_tenure || null,
            project_name: data.project_name || null,
            project_location: data.project_location || null,
            principal: data.principal || null,
            surety_bond_type: data.surety_bond_type || null,
          }),
        });
        if (!apiRes.ok) {
          const errBody = await apiRes.json().catch(() => null);
          throw new Error(errBody?.error || "Failed to create policy");
        }
        const created = await apiRes.json();

        // Create a document record so the file appears in the Documents tab
        if (pdfUrl && uploadedFile) {
          try {
            await documentService.create({
              file_path: pdfUrl,
              file_url: pdfUrl,
              file_name: uploadedFile.name,
              file_size: uploadedFile.size,
              uploaded_by: user.uid,
              document_type: "policy",
              policy_id: created.id,
              customer_id: data.customer_id,
            });
            invalidateDocuments();
          } catch (docErr) {
            console.warn("[policy-form] Failed to create document record:", docErr);
          }
        }

        toast.success(`Policy ${created.policy_number} created successfully`);
      }

      invalidatePolicies();
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Policy save error:", err);
      toast.error(friendlyError(err instanceof Error ? err : new Error(String(err)), "Failed to save policy"));
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {isEdit ? "Edit Policy" : "Add New Policy"}
            </DialogTitle>
            <DialogDescription>
              {isEmployee
                ? "Upload a policy document (PDF or image) to auto-fill details, then verify and save."
                : "Create a new policy manually or extract from a document."}
            </DialogDescription>
          </DialogHeader>

          {/* Mode Tabs — Admin/Manager only */}
          {!isEmployee && !isEdit && (
            <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "upload")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <PenLine className="h-4 w-4" /> Manual
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" /> Upload
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* PDF Upload Zone */}
          <AnimatePresence>
            {(mode === "upload" || isEmployee) && !isEdit && (
              <PolicyUploadZone
                uploadedFile={uploadedFile}
                extractedData={extractedData}
                isExtracting={isExtracting}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                fuzzyMatches={fuzzyMatches}
                isAutoCreating={isAutoCreating}
                autoCreatedCustomer={autoCreatedCustomer}
                onFileUpload={handleFileUpload}
                onClearFile={() => {
                  setUploadedFile(null);
                  setExtractedData(null);
                  setAutoCreatedCustomer(null);
                }}
                onSelectCustomer={selectCustomer}
                onAutoCreateCustomer={handleAutoCreateCustomer}
              />
            )}
          </AnimatePresence>

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Customer Search */}
              {!isEdit && (
                <CustomerSearchField
                  selectedCustomer={selectedCustomer}
                  searchQuery={customerSearchQuery}
                  results={customerResults}
                  isSearching={isSearching}
                  errorMessage={form.formState.errors.customer_id?.message}
                  onSearch={searchCustomers}
                  onSelect={selectCustomer}
                  onClear={() => {
                    setSelectedCustomer(null);
                    form.setValue("customer_id", "");
                    form.setValue("customer_name", "");
                  }}
                />
              )}

              <Separator />

              {/* Policy Details */}
              <PolicyDetailsGrid
                isEdit={isEdit}
                campaigns={isAdminOrManager ? campaigns ?? [] : []}
                users={isAdminOrManager ? activeUsers ?? [] : []}
                showAssignTo={isAdminOrManager}
              />

              {/* Submit */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isExtracting}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isEdit ? "Updating..." : "Saving..."}
                    </span>
                  ) : isEdit ? (
                    "Update Policy"
                  ) : isEmployee ? (
                    "Verify & Save"
                  ) : (
                    "Create Policy"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Verification Popup for Employees */}
      <VerificationPopup
        open={showVerification}
        onOpenChange={setShowVerification}
        policyData={form.getValues()}
        onConfirm={handleVerifiedSave}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
