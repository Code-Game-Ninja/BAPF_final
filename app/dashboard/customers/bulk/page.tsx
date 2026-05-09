"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Download, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  Table as TableIcon,
  Trash2,
  Inbox
} from "lucide-react";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function BulkOnboardingPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<'idle' | 'validating' | 'processing' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.csv') || selectedFile.name.endsWith('.xlsx')) {
        setFile(selectedFile);
        startValidation();
      } else {
        toast.error("Invalid file format. Please upload .csv or .xlsx");
      }
    }
  };

  const startValidation = () => {
    setUploadState('validating');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState('processing');
          startProcessing();
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const startProcessing = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploadState('success');
          toast.success("Bulk customer data processed successfully!");
          return 100;
        }
        return prev + 5;
      });
    }, 150);
  };

  const reset = () => {
    setFile(null);
    setUploadState('idle');
    setProgress(0);
  };

  return (
    <motion.div className="max-w-5xl mx-auto space-y-8 pb-20" {...pageTransition}>
      {/* Header */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 text-primary">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">IRDA Standard Compliant</Badge>
          <span className="text-xs font-bold uppercase tracking-widest opacity-50">Enterprise Module</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight font-heading sm:text-5xl">
          Bulk <span className="text-primary italic">Onboarding</span> Center
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
          Upload customer populations for GMC (Group Mediclaim), Fleet, or Large Corporates. 
          Our validation engine ensures data integrity before entry.
        </p>
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Upload Zone */}
        <div className="md:col-span-2 space-y-6">
          <motion.div 
            variants={staggerItem}
            className={cn(
              "relative border-2 border-dashed rounded-[2.5rem] p-12 transition-all overflow-hidden flex flex-col items-center justify-center min-h-[400px]",
              isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-border bg-card/40 hover:bg-card hover:border-primary/50",
              uploadState !== 'idle' && "pointer-events-none"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if(f) handleFileSelect({ target: { files: [f] } } as any); }}
          >
             {uploadState === 'idle' ? (
               <>
                 <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                   <Upload className="h-10 w-10 text-primary" />
                 </div>
                 <h3 className="text-2xl font-bold mb-2">Drop population file here</h3>
                 <p className="text-muted-foreground mb-8">Support for .csv, .xlsx (Max 50k rows)</p>
                 <Input type="file" id="file-upload" className="hidden" onChange={handleFileSelect} accept=".csv, .xlsx" />
                 <Button asChild className="h-12 px-8 rounded-xl font-bold">
                   <label htmlFor="file-upload" className="cursor-pointer">Browse Files</label>
                 </Button>
               </>
             ) : (
               <div className="w-full max-w-md space-y-6 text-center">
                 <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                   {uploadState === 'success' ? <CheckCircle2 className="h-12 w-12 text-emerald-500" /> : <Loader2 className="h-12 w-12 text-primary animate-spin" />}
                 </div>
                 <h3 className="text-2xl font-bold capitalize">
                   {uploadState === 'validating' && "Validating Schema..."}
                   {uploadState === 'processing' && "Injecting Records..."}
                   {uploadState === 'success' && "Import Complete"}
                 </h3>
                 <Progress value={progress} className="h-3 rounded-full" />
                 <p className="text-muted-foreground text-sm">
                   {uploadState === 'validating' && "Checking mandatory fields (PAN, GST, Mobile)..."}
                   {uploadState === 'processing' && `Processing records... ${progress}%`}
                   {uploadState === 'success' && "248 records successfully added to Customer Master."}
                 </p>
                 {uploadState === 'success' && (
                   <div className="pt-6">
                     <Button variant="outline" className="rounded-xl px-8" onClick={reset}>Onboard Another Population</Button>
                   </div>
                 )}
               </div>
             )}
          </motion.div>

          {/* Guidelines info */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-none bg-blue-500/5">
              <CardContent className="p-4 flex gap-3">
                <ShieldAlert className="h-5 w-5 text-blue-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">IRDA Validation</p>
                  <p className="text-xs text-muted-foreground">Mobile number and PAN/GST are mandatory for all entity records.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none bg-amber-500/5">
              <CardContent className="p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Duplicate Check</p>
                  <p className="text-xs text-muted-foreground">Entries matching existing Mobile or Email will be flagged for merge.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Templates & Side info */}
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-border bg-card/40 overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold">Import Templates</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use our pre-formatted templates to ensure zero validation errors.
              </p>
              
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-between h-14 rounded-xl border-border px-4 hover:border-primary/50 group">
                  <div className="flex items-center gap-3">
                    <TableIcon className="h-5 w-5 opacity-50" />
                    <span className="text-sm font-bold">Individual / Family</span>
                  </div>
                  <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-14 rounded-xl border-border px-4 hover:border-primary/50 group">
                  <div className="flex items-center gap-3">
                    <Inbox className="h-5 w-5 opacity-50" />
                    <span className="text-sm font-bold">Corporate (GMC)</span>
                  </div>
                  <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
                <Button variant="outline" className="w-full justify-between h-14 rounded-xl border-border px-4 hover:border-primary/50 group">
                  <Trash2 className="h-5 w-5 opacity-50" />
                  <span className="text-sm font-bold">Fleet Population</span>
                  <Download className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-none bg-gradient-to-br from-primary to-indigo-600 text-white overflow-hidden shadow-2xl shadow-primary/20">
            <CardContent className="p-8 space-y-4">
              <h4 className="font-bold">Need Help?</h4>
              <p className="text-xs opacity-90 leading-relaxed">
                If you have a population above 50,000 records or custom data mapping requirements, please contact technical support.
              </p>
              <Button className="w-full bg-white/20 hover:bg-white/30 border-none text-white font-bold h-12 rounded-xl backdrop-blur-md">
                Raise Ticket
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
