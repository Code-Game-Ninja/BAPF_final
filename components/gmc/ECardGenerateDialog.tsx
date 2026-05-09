"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Download, Mail, Loader2, CheckCircle } from "lucide-react";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface ECardGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  memberId: string;
  memberName: string;
  memberEmail?: string;
}

export function ECardGenerateDialog({
  open,
  onOpenChange,
  customerId,
  memberId,
  memberName,
  memberEmail,
}: ECardGenerateDialogProps) {
  const { session } = useAuth();
  const token = session?.access_token ?? "";

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ file_url: string } | null>(null);
  const [sendEmail, setSendEmail] = useState(false);
  const [emailAddress, setEmailAddress] = useState(memberEmail || "");

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gmc/${customerId}/members/${memberId}/ecard`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          send_email: sendEmail,
          email: sendEmail ? emailAddress : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate e-card");
      }

      const data = await res.json();
      setResult(data);
      toast.success("E-Card generated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate e-card");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setSendEmail(false);
    setEmailAddress(memberEmail || "");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading uppercase tracking-wider flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Generate E-Card
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-sm font-medium">{memberName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member ID: {memberId.slice(0, 8)}...</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSendEmail(!sendEmail)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    sendEmail ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {sendEmail && <CheckCircle className="w-3 h-3 text-white" />}
                </button>
                <Label className="cursor-pointer" onClick={() => setSendEmail(!sendEmail)}>
                  Email E-Card to member
                </Label>
              </div>

              {sendEmail && (
                <div className="space-y-1.5 ml-8">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={emailAddress}
                    onChange={e => setEmailAddress(e.target.value)}
                    placeholder="member@company.com"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 text-green-400">
              <CheckCircle className="w-6 h-6" />
              <div>
                <p className="font-medium text-sm">E-Card generated successfully</p>
                {sendEmail && emailAddress && (
                  <p className="text-xs text-muted-foreground mt-0.5">Sent to {emailAddress}</p>
                )}
              </div>
            </div>
            <Button asChild className="w-full gap-2">
              <a href={result.file_url} target="_blank" rel="noopener noreferrer">
                <Download className="w-4 h-4" /> Download PDF
              </a>
            </Button>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                {loading ? "Generating..." : "Generate E-Card"}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
