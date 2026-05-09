"use client";

import { FileText, Upload, Download, Trash2, CheckCircle, XCircle, Clock, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import { KYCDocument } from "@/lib/types";
import { kycService } from "@/lib/services/kyc.service";
import { useAuth } from "@/lib/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { KYCUploadDialog } from "@/components/kyc/kyc-upload-dialog";
import { format } from "date-fns";

const KYC_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar", pan: "PAN", gst: "GST", address_proof: "Address Proof",
  passport: "Passport", driving_license: "Driving License", voter_id: "Voter ID",
  bank_statement: "Bank Statement", company_registration: "Company Reg.", other: "Other",
};

interface DocumentsTabProps {
  customerId: string;
  kycDocs: KYCDocument[];
  onMutate: () => void;
  kycUploadOpen: boolean;
  setKycUploadOpen: (open: boolean) => void;
  customerName: string;
}

export function DocumentsTab({ customerId, kycDocs, onMutate, kycUploadOpen, setKycUploadOpen, customerName }: DocumentsTabProps) {
  const { role, user } = useAuth();
  const canVerify = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  const pendingCount = kycDocs.filter(d => d.status === "pending").length;

  const handleVerify = async (id: string) => {
    if (!user) return;
    try {
      await kycService.verify(id, user.id);
      toast.success("Document verified");
      onMutate();
    } catch { toast.error("Failed to verify"); }
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    try {
      await kycService.reject(id, user.id, "Does not meet requirements");
      toast.success("Document rejected");
      onMutate();
    } catch { toast.error("Failed to reject"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await kycService.delete(id);
      toast.success("Document removed");
      onMutate();
    } catch { toast.error("Failed to delete"); }
  };

  const handleView = async (filePath: string) => {
    try {
      const url = await kycService.getSignedUrl(filePath);
      window.open(url, "_blank");
    } catch { toast.error("Could not load document"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-bold uppercase tracking-wider text-sm">KYC Documents</h3>
          <Badge variant="secondary" className="text-xs">{kycDocs.length}</Badge>
          {pendingCount > 0 && (
            <Badge className="bg-amber-500/10 text-amber-400 text-xs">{pendingCount} pending</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => setKycUploadOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" /> Upload Document
        </Button>
      </div>

      {kycDocs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No KYC documents uploaded yet.</p>
          <Button size="sm" variant="outline" onClick={() => setKycUploadOpen(true)} className="gap-2 mt-3">
            <Upload className="w-4 h-4" /> Upload First Document
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {kycDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/20 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {KYC_LABEL[doc.document_type] || doc.document_type}
                  {doc.document_number && (
                    <span className="ml-2 text-xs font-mono text-muted-foreground">#{doc.document_number}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {doc.file_name}
                  {(doc as any).created_at && ` · ${format(new Date((doc as any).created_at), "dd MMM yyyy")}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className={`text-xs ${
                  doc.status === "verified" ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : doc.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {doc.status === "verified" && <CheckCircle className="w-3 h-3 mr-1" />}
                  {doc.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                  {doc.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                  {doc.status}
                </Badge>
                {doc.file_path && (
                  <button onClick={() => handleView(doc.file_path)} className="text-muted-foreground hover:text-primary transition-colors" title="View">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                {canVerify && doc.status === "pending" && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handleVerify(doc.id)}
                      className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10">
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Verify</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleReject(doc.id)}
                      className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">
                      <XCircle className="w-3.5 h-3.5 mr-1" /><span className="text-xs">Reject</span>
                    </Button>
                  </>
                )}
                {canDelete && (
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(doc.id)}
                    className="h-7 px-2 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <KYCUploadDialog
        open={kycUploadOpen}
        onOpenChange={setKycUploadOpen}
        customerId={customerId}
        customerName={customerName}
        onSuccess={onMutate}
      />
    </div>
  );
}
