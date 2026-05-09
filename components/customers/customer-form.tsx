"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserPlus, Save } from "lucide-react";
import { toast } from "sonner";

import { customerService } from "@/lib/services/customer.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { useAuth } from "@/lib/context/auth-context";
import { invalidateCustomers } from "@/lib/hooks/use-customers";
import { friendlyError } from "@/lib/helpers/friendly-error";
import { customerSchema, CustomerFormData } from "@/lib/validations/customer";
import { Customer } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { CustomerCreatedSuccess } from "./customer-created-success";
import { PersonalInfoFields } from "./personal-info-fields";
import { AddressFields } from "./address-fields";

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Customer | null;
  onSuccess?: (customer: { id: string; uid: string }) => void;
}

export function CustomerForm({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: CustomerFormProps) {
  const { user, session } = useAuth();
  const [saving, setSaving] = useState(false);
  const [createdUID, setCreatedUID] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [portalCreated, setPortalCreated] = useState(false);

  const isEdit = !!editData;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: editData?.name || "",
      email: editData?.email || "",
      phone: editData?.phone || "",
      address: editData?.address || "",
      city: editData?.city || "",
      state: editData?.state || "",
      pincode: editData?.pincode || "",
    },
  });

  // Re-initialize form when editData changes (e.g. editing a different customer)
  useEffect(() => {
    if (open) {
      form.reset({
        name: editData?.name || "",
        email: editData?.email || "",
        phone: editData?.phone || "",
        address: editData?.address || "",
        city: editData?.city || "",
        state: editData?.state || "",
        pincode: editData?.pincode || "",
      });
    }
  }, [editData, open, form]);

  const handleEmailBlur = async () => {
    const email = form.getValues("email");
    if (!email || form.formState.errors.email) return;
    const exists = await customerService.emailExists(
      email,
      editData?.id
    );
    if (exists) {
      form.setError("email", {
        type: "manual",
        message: "This email is already registered to another customer",
      });
    }
  };

  const handlePhoneBlur = async () => {
    const phone = form.getValues("phone");
    if (!phone || form.formState.errors.phone) return;
    const exists = await customerService.phoneExists(
      phone,
      editData?.id
    );
    if (exists) {
      form.setError("phone", {
        type: "manual",
        message: "This phone number is already registered",
      });
    }
  };

  const onSubmit = async (data: CustomerFormData) => {
    if (!user) return;
    setSaving(true);

    try {
      // Clean optional empty strings to undefined
      const cleanData = {
        ...data,
        address: data.address || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        pincode: data.pincode || undefined,
      };

      if (isEdit && editData) {
        const token = session?.access_token;
        const res = await fetch(`/api/customers/${editData.id}/update`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(cleanData),
        });

        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error || "Failed to update customer");
        }

        await auditLogService.logAction(
          user.id,
          user.name,
          "update",
          "customer",
          `Updated customer: ${data.name} (${editData.uid})`
        );
        toast.success("Customer updated successfully");
        invalidateCustomers();
        onOpenChange(false);
        onSuccess?.({ id: editData.id, uid: editData.uid });
      } else {
        const result = await customerService.createCustomer({
          ...cleanData,
          created_by: user.id,
        });
        await auditLogService.logAction(
          user.id,
          user.name,
          "create",
          "customer",
          `Created customer: ${data.name} (${result.uid})`
        );
        setCreatedUID(result.uid);
        toast.success(`Customer created — UID: ${result.uid}`);
        invalidateCustomers();
        onSuccess?.(result);

        // Auto-create customer portal account
        try {
          const token = session?.access_token;
          if (!token) throw new Error("No auth token available");
          const portalRes = await fetch("/api/customers/create-portal-account", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              customerId: result.id,
              name: data.name,
              email: data.email,
              phone: data.phone,
            }),
          });
          const portalData = await portalRes.json();
          if (portalRes.ok && portalData.success) {
            setPortalCreated(true);
            toast.success("Portal account created — view credentials in Portal Credentials page");
          } else if (portalRes.ok && portalData.existing) {
            setPortalCreated(true);
            toast.info("Portal account already exists for this customer");
          }
        } catch {
          // Non-critical — customer was still created in the database
          console.warn("[customer-form] Portal account creation failed");
        }

        // Return to customer list immediately after creation so the new row is visible.
        onOpenChange(false);
      }
    } catch (error: unknown) {
      toast.error(friendlyError(error, "Failed to save customer"));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUID = async () => {
    if (!createdUID) return;
    await navigator.clipboard.writeText(createdUID);
    setCopied(true);
    toast.success("UID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    form.reset();
    setCreatedUID(null);
    setCopied(false);
    setPortalCreated(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-130 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-cabin uppercase tracking-wider">
            {isEdit ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? `Editing ${editData?.name} (${editData?.uid})`
              : "Fill in the customer details. UID will be auto-generated."}
          </DialogDescription>
        </DialogHeader>

        {/* Success state — show UID + portal credentials */}
        {createdUID && !isEdit ? (
          <CustomerCreatedSuccess
            uid={createdUID}
            copied={copied}
            onCopy={handleCopyUID}
            onClose={handleClose}
            portalCreated={portalCreated}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <PersonalInfoFields
                onPhoneBlur={handlePhoneBlur}
                onEmailBlur={handleEmailBlur}
              />

              <AddressFields />

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isEdit ? (
                    <Save className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {saving
                    ? "Saving..."
                    : isEdit
                    ? "Update Customer"
                    : "Create Customer"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
