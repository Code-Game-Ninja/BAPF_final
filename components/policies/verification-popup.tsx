"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  verificationSchema,
  type VerificationFormData,
} from "@/lib/validations/policy";
import type { PolicyFormData } from "@/lib/validations/policy";

interface VerificationPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyData: Partial<PolicyFormData>;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

const VERIFICATION_ITEMS = [
  {
    key: "policyNumberCorrect" as const,
    label: "Policy number is correct",
    description: "I have verified the policy number matches the document",
  },
  {
    key: "datesCorrect" as const,
    label: "Policy dates are correct",
    description: "Start and end dates match the original policy document",
  },
  {
    key: "premiumCorrect" as const,
    label: "Premium amount is correct",
    description: "The premium amount matches the policy document",
  },
  {
    key: "customerCorrect" as const,
    label: "Customer details are correct",
    description: "Customer name and other details are accurately filled",
  },
  {
    key: "finalConfirmation" as const,
    label: "I confirm all details are accurate",
    description:
      "I take responsibility for the accuracy of this policy entry",
  },
];

export function VerificationPopup({
  open,
  onOpenChange,
  policyData,
  onConfirm,
  isSubmitting = false,
}: VerificationPopupProps) {
  const form = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      policyNumberCorrect: false as unknown as true,
      datesCorrect: false as unknown as true,
      premiumCorrect: false as unknown as true,
      customerCorrect: false as unknown as true,
      finalConfirmation: false as unknown as true,
    },
  });

  const watchAll = form.watch();

  // Check if all items are true
  const isAllChecked =
    watchAll.policyNumberCorrect === true &&
    watchAll.datesCorrect === true &&
    watchAll.premiumCorrect === true &&
    watchAll.customerCorrect === true &&
    watchAll.finalConfirmation === true;

  function handleSubmit() {
    if (isAllChecked) {
      onConfirm();
    }
  }

  function handleClose() {
    form.reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Verify Policy Details
          </DialogTitle>
          <DialogDescription>
            Please verify all details before saving. All checkboxes must be
            confirmed.
          </DialogDescription>
        </DialogHeader>

        {/* Policy Summary */}
        <div className="rounded-lg border border-muted-foreground/30 bg-card p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Policy #:</span>{" "}
              <span className="font-medium text-foreground">
                {policyData.policy_number || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              <span className="font-medium text-foreground">
                {policyData.policy_type || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Premium:</span>{" "}
              <span className="font-medium text-foreground">
                {policyData.premium_amount
                  ? `₹${policyData.premium_amount.toLocaleString("en-IN")}`
                  : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Customer:</span>{" "}
              <span className="font-medium text-foreground">
                {policyData.customer_name || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Start:</span>{" "}
              <span className="font-medium text-foreground">
                {policyData.start_date || "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">End:</span>{" "}
              <span className="font-medium text-foreground">
                {policyData.end_date || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Checklist */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            {VERIFICATION_ITEMS.map((item, index) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <FormField
                  control={form.control}
                  name={item.key}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-muted-foreground/20 p-3 transition-colors hover:border-primary/40">
                      <FormControl>
                        <Checkbox
                          checked={field.value === true}
                          onCheckedChange={(checked) => {
                            field.onChange(checked === true ? true : false);
                          }}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-none">
                        <FormLabel className="cursor-pointer text-sm font-medium">
                          {item.label}
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            ))}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isAllChecked || isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="inline-block h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                    />
                    Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Save
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {/* Warning if not all checked */}
        <AnimatePresence>
          {!isAllChecked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 rounded-md bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              All checkboxes must be confirmed to save
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
