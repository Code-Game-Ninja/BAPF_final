"use client";

import { motion } from "framer-motion";
import { Cake, Sparkles, Gift, ArrowRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCelebrations } from "@/lib/hooks/use-dashboard";

export function CelebrationRegistry() {
  const { data: celebrations, isLoading } = useCelebrations();

  if (isLoading) return <div className="h-40 w-full animate-pulse bg-muted/20 rounded-3xl" />;

  return (
    <div className="rounded-[2rem] border border-border bg-card/40 backdrop-blur-md p-6 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-amber-500" /> Celebration Registry
        </h4>
        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
      </div>

      <div className="space-y-3">
        {celebrations?.length ? (
          celebrations.map((item: any) => (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-3 rounded-xl border border-primary/10 bg-primary/5 transition-all hover:bg-primary/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-background shadow-sm border border-border/50 flex items-center justify-center text-primary group-hover:rotate-12 transition-transform">
                  {item.type === 'birthday' ? <Cake className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-tight">{item.name}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-70">
                    {item.type} • {item.date ? new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 scale-0 group-hover:scale-100 transition-all origin-right">
                <a 
                  href={`https://wa.me/?text=Hello ${item.name}, Happy ${item.type} from BP %26 AF Insurance Broker!`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground italic text-xs border-2 border-dashed border-border/50 rounded-2xl">
            No milestones in the next 7 days.
          </div>
        )}
      </div>

      <p className="text-[8px] font-bold text-center text-muted-foreground uppercase tracking-widest leading-relaxed">
        Send wishes to strengthen client relationships.
      </p>
    </div>
  );
}
