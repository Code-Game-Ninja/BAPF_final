"use client";

import { AlertTriangle, User, Phone, Mail, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface DuplicateMatch {
  field: "phone" | "email" | "pan" | "gst";
  customer: {
    id: string;
    uid: string;
    name: string;
    phone: string;
    email: string;
    customer_type?: string;
    status?: string;
  };
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: DuplicateMatch[];
  onProceed: () => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  phone: "Phone Number",
  email: "Email Address",
  pan: "PAN Number",
  gst: "GST Number",
};

export function DuplicateWarningDialog({
  open,
  onOpenChange,
  matches,
  onProceed,
  onCancel,
}: DuplicateWarningDialogProps) {
  const router = useRouter();

  // Deduplicate by customer id
  const uniqueMatches = matches.filter(
    (m, i, arr) => arr.findIndex(x => x.customer.id === m.customer.id) === i
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading uppercase tracking-wider text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            Duplicate Customer Detected
          </DialogTitle>
          <DialogDescription>
            A customer with matching details already exists in the system.
            Review the existing records below before proceeding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {uniqueMatches.map((match, idx) => (
            <div
              key={`${match.customer.id}-${idx}`}
              className="flex items-start gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5"
            >
              <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-amber-400">
                  {match.customer.name?.charAt(0)?.toUpperCase() || "?"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{match.customer.name}</p>
                  <Badge variant="secondary" className="font-mono text-xs text-primary bg-primary/10">
                    {match.customer.uid}
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/20">
                    Matched on {FIELD_LABELS[match.field]}
                  </Badge>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  {match.customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {match.customer.phone}
                    </span>
                  )}
                  {match.customer.email && match.customer.email !== "N/A" && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {match.customer.email}
                    </span>
                  )}
                  <span className="capitalize">{match.customer.customer_type || "individual"}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  onCancel();
                  router.push(`/dashboard/customers/${match.customer.id}`);
                }}
                className="text-muted-foreground hover:text-primary transition-colors flex-shrink-0"
                title="View existing customer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
          <strong>Tip:</strong> Click the external link icon to view the existing customer before deciding.
          Proceeding will create a new record alongside the existing one.
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={onProceed}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Proceed Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
