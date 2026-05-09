"use client";

import { motion } from "framer-motion";
import { 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  Car, 
  Users2, 
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSearch,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";
import Link from "next/link";
import { cn } from "@/lib/utils";

const templates = [
  { 
    id: "gmc_census", 
    label: "GMC Census Template", 
    description: "Employee & Dependent data for Group Health",
    icon: Users2,
    color: "bg-blue-500/10 text-blue-600",
    fields: ["Emp ID", "Name", "DOB", "Gender", "Relationship", "Sum Insured"]
  },
  { 
    id: "fleet_inventory", 
    label: "Fleet Vehicle List", 
    description: "RC details, Make/Model, and IDV for motor",
    icon: Car,
    color: "bg-emerald-500/10 text-emerald-600",
    fields: ["Reg No", "Engine No", "Chassis No", "Make", "Model", "Year"]
  },
  { 
    id: "customer_master", 
    label: "Bulk Customer Onboarding", 
    description: "Import legacy client list to CRM",
    icon: Database,
    color: "bg-purple-500/10 text-purple-600",
    fields: ["Name", "Phone", "Email", "PAN", "GSTIN", "Address"]
  },
];

export default function BulkOnboardingPage() {
  return (
    <motion.div
      className="max-w-5xl mx-auto space-y-12 pb-20 pt-4"
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      transition={pageTransition.transition}
    >
      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Link href="/dashboard/intake">
            <Button variant="ghost" size="sm" className="p-0 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Intake
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight font-heading uppercase">
              Bulk <span className="text-primary italic">Onboarding</span> Center
            </h1>
            <p className="text-muted-foreground max-w-xl">
              Upload large datasets for GMC, Fleet, or Legacy Migration. Our engine validates every row for compliance before commit.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-2 gap-2 h-12">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-wider">Upload History</span>
          </Button>
          <Button className="rounded-xl gap-2 h-12 px-6">
            <Upload className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Start New Import</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Templates Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 px-1">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Download Master Templates</h2>
          </div>

          <motion.div 
            variants={staggerContainer} 
            initial="initial" 
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {templates.map((tpl) => (
              <motion.div
                key={tpl.id}
                variants={staggerItem}
                {...hoverLift}
                className="group p-6 rounded-3xl border border-border bg-card/40 hover:bg-card hover:border-primary/30 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shadow-sm", tpl.color)}>
                    <tpl.icon className="h-6 w-6" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground group-hover:text-primary">
                    <Download className="h-5 w-5" />
                  </Button>
                </div>
                <h3 className="font-bold text-lg mb-1">{tpl.label}</h3>
                <p className="text-xs text-muted-foreground mb-4">{tpl.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.fields.map(f => (
                    <span key={f} className="text-[9px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Validation Tool Placeholder */}
          <div className="rounded-[2.5rem] border-2 border-dashed border-border bg-muted/20 p-12 text-center space-y-6">
             <div className="h-20 w-20 rounded-full bg-card mx-auto flex items-center justify-center border-2 border-border shadow-xl">
                <FileSearch className="h-10 w-10 text-muted-foreground" />
             </div>
             <div className="space-y-2">
                <h3 className="text-2xl font-bold font-heading">Smart Validation Engine</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Drag and drop your Excel file here. We will check for duplicates, missing fields, and IRDA compliance violations in real-time.
                </p>
             </div>
             <div className="flex items-center justify-center gap-4 pt-4">
                <Button className="h-14 px-10 rounded-2xl gap-3 text-sm font-bold uppercase tracking-wider">
                    <Upload className="h-5 w-5" />
                    Select File
                </Button>
             </div>
             <p className="text-[10px] text-muted-foreground">Supported formats: .xlsx, .csv, .ods (Max 50MB per file)</p>
          </div>
        </div>

        {/* Sidebar Ops Info */}
        <div className="space-y-6">
          <div className="p-6 rounded-[2rem] border border-border bg-card/60 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Important Rules
            </h3>
            <div className="space-y-4">
               {[
                 { title: "Header Match", text: "Ensure column headers match exactly with templates." },
                 { title: "Date Formats", text: "Use DD/MM/YYYY for all date fields for reliability." },
                 { title: "Unique ID", text: "Employee ID (GMC) and Reg No (Fleet) must be unique." },
                 { title: "Validation Error", text: "Any single errant row will pause the entire import." },
               ].map((rule) => (
                 <div key={rule.title} className="space-y-1">
                    <p className="text-xs font-bold text-foreground">{rule.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{rule.text}</p>
                 </div>
               ))}
            </div>
            <div className="pt-4 border-t border-border/50">
                <Button variant="outline" className="w-full text-[10px] font-black uppercase tracking-widest h-10 rounded-xl">
                    Full Compliance Guide
                </Button>
            </div>
          </div>

          <div className="p-6 rounded-[2rem] border-2 border-emerald-500/20 bg-emerald-500/5 space-y-4">
             <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Ready to Merge?</h4>
             </div>
             <p className="text-xs text-emerald-800/70 dark:text-emerald-300/70 leading-relaxed">
                Our engine automatically detects if a customer already exists by PAN/GSTIN and merges the new data instead of creating duplicates.
             </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
