"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, UserPlus, Building2, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { manualCustomerValidationSchema, type ManualCustomerFormData } from "@/lib/validations/customer";
import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";
import { useAuth } from "@/lib/context/auth-context";
import { invalidateCustomers } from "@/lib/hooks/use-customers";
import { friendlyError } from "@/lib/helpers/friendly-error";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { BasicInfo } from "./basic-info";
import { IndividualDetails } from "./individual-details";
import { CorporateDetails } from "./corporate-details";
import { CorporateMembers } from "./corporate-members";
import { FamilyDetails } from "./family-details";
import { DocumentUpload } from "./document-upload";
import {
  DuplicateWarningDialog,
  type DuplicateMatch,
} from "@/components/customers/DuplicateWarningDialog";

export function ManualCustomerForm() {
  const router = useRouter();
  const { user, session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [pendingData, setPendingData] = useState<ManualCustomerFormData | null>(null);

  const form = useForm<ManualCustomerFormData>({
    resolver: zodResolver(manualCustomerValidationSchema),
    defaultValues: {
      type: "individual",
      name: "",
      email: "",
      phone: "",
      assigned_to: "",
      dob: "",
      gender: "male" as const,
      family_members: [],
      documents: [],
    } as any,
  } as any);

  const type = form.watch("type");

  const doCreate = async (data: ManualCustomerFormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const result = await customerService.createManualCustomer(data, user.id);
      await auditLogService.logAction(
        user.id,
        user.name,
        "create",
        "customer",
        `Created manual ${data.type} customer: ${data.name} (${result.uid})`
      );
      toast.success(`Customer created — UID: ${result.uid}`);
      invalidateCustomers();
      router.push(`/dashboard/customers/${result.id}`);
    } catch (error: unknown) {
      toast.error(friendlyError(error instanceof Error ? error : new Error(String(error)), "Failed to create customer"));
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (data: ManualCustomerFormData) => {
    if (!user) {
      toast.error("You must be logged in to create a customer");
      return;
    }

    // ── Duplicate detection via API ──────────────────────────────
    try {
      const token = session?.access_token;
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone,
          email: data.email,
          type: data.type,
          entity_meta:
            data.type === "individual"
              ? { pan_number: data.pan_number }
              : { pan_number: data.pan_number, gst_number: data.gst_number },
          // Don't actually create — just check for duplicates
          // We'll use force_create=false (default) to trigger duplicate check
        }),
      });

      if (res.status === 409) {
        const body = await res.json();
        if (body.duplicate && body.matches?.length > 0) {
          setDuplicateMatches(body.matches);
          setPendingData(data);
          return; // Show dialog, don't proceed
        }
      }
    } catch {
      // If duplicate check fails, proceed with creation anyway
    }

    await doCreate(data);
  };

  const handleProceedAnyway = async () => {
    setDuplicateMatches([]);
    if (pendingData) {
      await doCreate(pendingData);
      setPendingData(null);
    }
  };

  const handleCancelDuplicate = () => {
    setDuplicateMatches([]);
    setPendingData(null);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-500">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold font-cabin tracking-tight flex items-center gap-2">
                <UserPlus className="w-8 h-8 text-primary" />
                Add Manual Customer
              </h1>
              <p className="text-muted-foreground mt-1 text-lg">
                Create a new production-grade record in the unified Customer Master.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving} className="px-6">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-2 px-8 shadow-lg shadow-primary/20">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {saving ? "Creating..." : "Save Customer"}
              </Button>
            </div>
          </div>

          {/* Entity Type Selection */}
          <Card className="p-1 bg-muted/30 border-primary/10">
            <div className="grid grid-cols-2 gap-2">
              {(["individual", "corporate"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => form.setValue("type", t)}
                  className={`flex items-center justify-center gap-3 py-4 rounded-xl transition-all duration-300 ${
                    type === t
                      ? "bg-background text-primary shadow-sm border border-primary/20 scale-[1.01]"
                      : "text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {t === "individual" ? (
                    <User className={`w-6 h-6 ${type === t ? "text-primary" : ""}`} />
                  ) : (
                    <Building2 className={`w-6 h-6 ${type === t ? "text-primary" : ""}`} />
                  )}
                  <span className="text-xl font-semibold capitalize">{t} Entity</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Form Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <BasicInfo form={form} />
              {type === "individual" ? (
                <>
                  <IndividualDetails form={form} />
                  <FamilyDetails form={form} />
                </>
              ) : (
                <>
                  <CorporateDetails form={form} />
                  <CorporateMembers form={form} />
                </>
              )}
            </div>

            <div className="space-y-8">
              <DocumentUpload form={form} />

              {/* Entity Health Card */}
              <Card className="p-6 bg-primary/5 border-primary/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck className="w-24 h-24" />
                </div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Entity Health
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-primary/10">
                    <span className="text-muted-foreground">Entity Type</span>
                    <span className="font-semibold capitalize">{type}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-primary/10">
                    <span className="text-muted-foreground">Duplicate Check</span>
                    <span className="text-green-400 font-semibold text-xs">Auto on Save</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-primary/10">
                    <span className="text-muted-foreground">Assignment</span>
                    <span className="font-semibold truncate max-w-[120px]">
                      {form.watch("assigned_to") ? "Configured" : "MISSING"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-6 leading-relaxed">
                  Duplicate detection runs on phone, email, and PAN before saving.
                </p>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      {/* Duplicate Warning Dialog */}
      <DuplicateWarningDialog
        open={duplicateMatches.length > 0}
        onOpenChange={open => { if (!open) handleCancelDuplicate(); }}
        matches={duplicateMatches}
        onProceed={handleProceedAnyway}
        onCancel={handleCancelDuplicate}
      />
    </>
  );
}
