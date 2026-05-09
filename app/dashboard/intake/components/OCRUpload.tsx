"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Plus, Zap, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onUpload: (file: File) => void;
  onSkip: () => void;
  isExtracting: boolean;
}

export function OCRUpload({ onUpload, onSkip, isExtracting }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div 
        className={cn(
          "bg-card/40 rounded-[3rem] border-2 border-dashed p-12 text-center space-y-10 shadow-2xl relative overflow-hidden transition-all",
          dragActive ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {isExtracting && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-background/80 backdrop-blur-md z-50 flex flex-col items-center justify-center space-y-6"
          >
            <div className="relative">
              <div className="h-24 w-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <Zap className="h-8 w-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black uppercase tracking-widest font-heading">AI Extraction in Progress</h4>
              <p className="text-sm text-muted-foreground italic">Fetching vehicle, member, and sum assured details from policy document...</p>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          <div className="h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mx-auto transition-transform group-hover:scale-110">
            <Upload className="h-10 w-10 text-primary" />
          </div>
          <h3 className="text-3xl font-bold font-heading">Policy OCR Engine</h3>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            Upload a <span className="text-foreground font-bold">PDF, Image, or Scan</span>. Our AI will automatically pre-fill customer, vehicle, and coverage details.
          </p>
        </div>

        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept=".pdf,image/*"
          onChange={handleChange}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            className="p-8 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
            onClick={() => inputRef.current?.click()}
          >
            <FileText className="h-8 w-8 mx-auto mb-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <p className="font-bold text-sm">Select Document</p>
            <p className="text-[10px] text-muted-foreground mt-1">PDF / Scan / Multi-page</p>
          </div>
          <div 
            className="p-8 rounded-3xl border border-border/50 bg-muted/20 flex flex-col items-center justify-center opacity-60"
          >
            <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Mobile Snap</p>
            <p className="text-[9px] text-muted-foreground mt-1">Coming Soon: QR Quick Upload</p>
          </div>
        </div>

        <div className="pt-6 border-t border-border/50 flex flex-col items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Or Proceed Manually</p>
          <Button variant="outline" className="h-12 rounded-2xl px-8 border-2 hover:bg-primary/5" onClick={onSkip}>
            Manual Data Entry <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
