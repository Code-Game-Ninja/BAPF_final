"use client";

import { motion } from "framer-motion";
import { FilePlus2, History, ShieldCheck, GitBranch, Target, LifeBuoy, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageTransition } from "@/lib/helpers/animations";

interface ActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const actions: ActionItem[] = [
  { id: "new_policy", label: "New Policy", icon: FilePlus2, description: "Issue a fresh policy" },
  { id: "renewal", label: "Renewal", icon: History, description: "Renew existing coverage" },
  { id: "claim", label: "Claim", icon: ShieldCheck, description: "Notify a new loss" },
  { id: "endorsement", label: "Endorsement", icon: GitBranch, description: "Modify existing policy" },
  { id: "quote", label: "Quote Request", icon: Target, description: "Generate premium estimates" },
  { id: "service", label: "Service Request", icon: LifeBuoy, description: "Non-financial servicing" },
];

interface Props {
  onSelect: (id: string) => void;
}

export function ActionSelection({ onSelect }: Props) {
  return (
    <motion.div {...pageTransition} className="max-w-4xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {actions.map((act) => (
          <Button
            key={act.id}
            variant="outline"
            className="h-auto flex flex-col items-center gap-4 p-8 rounded-[2rem] border-2 hover:border-primary/40 hover:bg-primary/5 group transition-all"
            onClick={() => onSelect(act.id)}
          >
            <div className="h-12 w-12 rounded-xl bg-muted group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center shadow-sm">
              <act.icon className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm uppercase tracking-wider">{act.label}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{act.description}</p>
            </div>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
