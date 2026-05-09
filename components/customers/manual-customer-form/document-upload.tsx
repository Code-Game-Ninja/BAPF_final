"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { 
  Upload, 
  Trash2, 
  FileText, 
  FilePlus, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ManualCustomerFormData } from "@/lib/validations/customer";
import { documentService } from "@/lib/services/document.service";
import { useAuth } from "@/lib/context/auth-context";

import { 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface DocumentUploadProps {
  form: UseFormReturn<ManualCustomerFormData>;
}

const DOCUMENT_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card" },
  { value: "pan", label: "PAN Card" },
  { value: "gst", label: "GST Certificate" },
  { value: "passport", label: "Passport" },
  { value: "voter_id", label: "Voter ID" },
  { value: "driving_license", label: "Driving License" },
  { value: "cancel_cheque", label: "Cancelled Cheque" },
  { value: "utility_bill", label: "Utility Bill" },
  { value: "other", label: "Other Document" },
];

export function DocumentUpload({ form }: DocumentUploadProps) {
  const { user } = useAuth();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const { fields, append, remove, update } = useFieldArray({
    control: form.control as any,
    name: "documents",
  });

  const handleFileChange = async (index: number, file: File) => {
    if (!user) return;
    
    const docType = form.getValues(`documents.${index}.type` as any);
    if (!docType) {
      toast.error("Please select a document type first");
      return;
    }

    setUploadingIndex(index);
    setProgress(0);

    try {
      const result = await documentService.uploadAndCreate(file, {
        document_type: docType,
        uploaded_by: user.id
      }, (p) => setProgress(p));

      update(index, {
        type: docType,
        url: result.file_url,
        name: file.name
      });

      toast.success(`${file.name} uploaded successfully`);
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setUploadingIndex(null);
      setProgress(0);
    }
  };

  return (
    <Card className="border-primary/10 shadow-md bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            KYC Repository
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Identity and address proofs.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 border-primary/20 hover:bg-primary/5"
          onClick={() => append({ type: "", url: "", name: "" })}
        >
          <FilePlus className="w-4 h-4" />
          Add Row
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-primary/10 rounded-xl bg-primary/2">
            <FileText className="w-10 h-10 text-muted-foreground/30 mb-2" />
            <p className="text-muted-foreground text-sm">No documents attached.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => {
              const url = form.watch(`documents.${index}.url` as any);
              const fileName = form.watch(`documents.${index}.name` as any);
              const isUploading = uploadingIndex === index;

              return (
                <div key={field.id} className="p-4 rounded-xl border border-primary/10 bg-muted/20 space-y-3 relative overflow-hidden">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-3">
                      <FormField
                        control={form.control}
                        name={`documents.${index}.type` as any}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!url || isUploading}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <SelectValue placeholder="Select Document Type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DOCUMENT_TYPES.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {!url && !isUploading ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`doc-file-${index}`}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileChange(index, f);
                            }}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="w-full gap-2 border-dashed border-primary/20"
                            onClick={() => document.getElementById(`doc-file-${index}`)?.click()}
                          >
                            <Upload className="w-3 h-3" />
                            Upload File
                          </Button>
                        </div>
                      ) : isUploading ? (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Uploading...
                            </span>
                            <span>{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-xs font-medium truncate">{fileName}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {!isUploading && !url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
