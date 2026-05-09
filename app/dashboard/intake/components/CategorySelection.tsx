"use client";

import { motion } from "framer-motion";
import { GitBranch, Users2, Building2, ArrowRight, ScanLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { staggerItem, hoverLift } from "@/lib/helpers/animations";
import { PolicyStatsByCategory } from "@/lib/services/policy.service";

export const categories = [
  {
    id: "motor",
    title: "Motor Products",
    description: "Private Car, 2-Wheeler, CV, and Passenger Vehicles.",
    icon: GitBranch, 
    color: "bg-blue-500",
    items: [
      { id: "private_car", name: "Private Car", description: "Comprehensive & TP" },
      { id: "two_wheeler", name: "2-Wheeler", description: "Scooter & Bike coverage" },
      { id: "cv", name: "Commercial Vehicle (CV)", description: "Trucks, Buses, Pickups" },
    ]
  },
  {
    id: "life",
    title: "Life & Savings",
    description: "Term, Endowment, ULIP and Pension schemes.",
    icon: Users2,
    color: "bg-emerald-500",
    items: [
      { id: "term_life", name: "Life Insurance", description: "Term & Protection plans" },
      { id: "endowment", name: "Endowment Plans", description: "Savings & Protection" },
      { id: "ulip", name: "ULIP Insurance", description: "Investment + Insurance" },
    ]
  },
  {
    id: "health",
    title: "Health & Wellness",
    description: "Retail Health, Group Health, and Specialized care.",
    icon: Users2,
    color: "bg-rose-500",
    items: [
      { id: "retail_health", name: "Individual/Family Health", description: "Standard coverage" },
      { id: "senior", name: "Senior Citizen", description: "Geriatric specialized" },
      { id: "group_health", name: "GMC / GPA", description: "Corporate coverage" },
    ]
  },
  {
    id: "commercial",
    title: "Commercial Lines",
    description: "Fire, Marine, Liability, and Engineering.",
    icon: Building2,
    color: "bg-amber-500",
    items: [
      { id: "fire", name: "Fire & Assets", description: "SME & Factory" },
      { id: "liability", name: "Liability", description: "Professional/Public" },
      { id: "marine", name: "Marine", description: "Cargo & Transit" },
    ]
  }
] as const;

interface Props {
  onSelect: (id: string) => void;
  onAutoDetect?: () => void;
  stats?: PolicyStatsByCategory;
  isLoading?: boolean;
}

export function CategorySelection({ onSelect, onAutoDetect, stats, isLoading }: Props) {
  // Get stats for a category, defaulting to 0 if loading or no data
  const getCategoryStats = (categoryId: string) => {
    if (isLoading || !stats) {
      return { active: 0, pending: 0 };
    }
    return stats[categoryId as keyof PolicyStatsByCategory] ?? { active: 0, pending: 0 };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Auto-Detect Option */}
      {onAutoDetect && (
        <motion.div
          variants={staggerItem}
          {...hoverLift}
          className="group relative rounded-[2.5rem] p-8 border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
          onClick={onAutoDetect}
        >
          <div className="absolute top-6 right-6">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
              <span className="text-[9px] font-black uppercase tracking-tighter text-primary">AI Powered</span>
            </div>
          </div>

          <div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-white flex items-center justify-center mb-6 shadow-lg">
              <ScanLine className="h-7 w-7" />
            </div>

            <h3 className="text-2xl font-bold mb-2">Auto-Detect</h3>
            <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
              Upload your policy PDF and let AI automatically detect the policy type and fill all fields.
            </p>
          </div>

          <div className="space-y-2 mt-auto">
            <div className="flex items-center justify-between p-2 rounded-xl border border-primary/20 bg-primary/5">
              <span className="text-xs font-bold text-primary">Smart Extraction</span>
              <ArrowRight className="h-3 w-3 text-primary" />
            </div>
          </div>
        </motion.div>
      )}

      {categories.map((cat) => {
        const categoryStats = getCategoryStats(cat.id);
        return (
          <motion.div
            key={cat.id}
            variants={staggerItem}
            {...hoverLift}
            className="group relative rounded-[2.5rem] p-8 border-2 border-border bg-card/40 hover:border-primary/40 hover:bg-card transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
            onClick={() => onSelect(cat.id)}
          >
            {/* Stats Badge - Real-time data */}
            <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Active</span>
                <span className="text-[10px] font-bold text-foreground">
                  {isLoading ? "—" : categoryStats.active}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/60 border border-border/50">
                <span className="text-[9px] font-black uppercase tracking-tighter opacity-70">Pending</span>
                <span className="text-[10px] font-bold text-foreground">
                  {isLoading ? "—" : categoryStats.pending}
                </span>
              </div>
            </div>

            <div>
              <div className={cn("h-14 w-14 rounded-2xl text-white flex items-center justify-center mb-6 shadow-lg", cat.color)}>
                <cat.icon className="h-7 w-7" />
              </div>

              <h3 className="text-2xl font-bold mb-2">{cat.title}</h3>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
                {cat.description}
              </p>
            </div>

            <div className="space-y-2 mt-auto">
              {cat.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all group/item">
                  <span className="text-xs font-bold group-hover/item:text-primary transition-colors">{item.name}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" />
                </div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
