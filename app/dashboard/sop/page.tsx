"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Search, MoreHorizontal, CheckCircle, Archive, Loader2, Sparkles, FileText, ShieldCheck, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/auth-context";
import { useSOPs } from "@/lib/hooks/use-sop";
import { sopService } from "@/lib/services/sop.service";
import type { SOP } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

const CATEGORIES = ["claims", "renewals", "onboarding", "compliance", "operations", "hr", "finance", "it", "other"];

export default function SOPPage() {
  const { user, role } = useAuth();
  const { data: sops, isLoading, mutate } = useSOPs();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [viewSOP, setViewSOP] = useState<SOP | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ title: "", category: "operations", content: "", version: "1.0" });
  const isAdmin = role === "admin" || role === "manager";

  const draftCount = (sops ?? []).filter((s) => s.status === "draft").length;
  const activeCount = (sops ?? []).filter((s) => s.status === "active").length;

  const filtered = (sops ?? []).filter(s => {
    if (searchQuery.trim() && !s.title.toLowerCase().includes(searchQuery.toLowerCase()) && !s.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (categoryFilter !== "all" && s.category !== categoryFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!user || !formData.title || !formData.content) return;
    setSaving(true);
    try {
      await sopService.create({ ...formData, version: parseFloat(formData.version) || 1, created_by: user.id, created_by_name: user.name } as Partial<SOP>);
      toast.success("SOP created");
      setFormOpen(false);
      setFormData({ title: "", category: "operations", content: "", version: "1.0" });
      mutate();
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              SOP governance desk
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Standard Operating Procedures
            </h1>
            <p className="text-sm text-muted-foreground">{filtered.length} SOP{filtered.length !== 1 ? "s" : ""} available for review and operational guidance.</p>
          </div>
          {isAdmin && (
            <motion.div {...hoverLift}>
              <Button onClick={() => setFormOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" /> Add SOP</Button>
            </motion.div>
          )}
        </div>
      </section>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: FileText, label: "Total SOPs", value: (sops ?? []).length, panel: "border-blue-500/30 bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
          { icon: ShieldCheck, label: "Active", value: activeCount, panel: "border-emerald-500/30 bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300" },
          { icon: Clock, label: "Drafts", value: draftCount, panel: "border-amber-500/30 bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
          { icon: BookOpen, label: "Filtered", value: filtered.length, panel: "border-indigo-500/30 bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300" },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <div className={`${item.panel} rounded-xl border px-4 py-3`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                  <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                  <item.icon className={`h-4 w-4 ${item.text}`} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search SOPs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 border-border/80 bg-background/80" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full border-border/80 bg-background/80 sm:w-37.5"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent className="border-border bg-popover">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      </section>

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50"><BookOpen className="h-8 w-8 text-muted-foreground" /></div>
          <p className="text-muted-foreground text-sm">No SOPs found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map(sop => (
            <div key={sop.id} className="cursor-pointer rounded-2xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_8px_20px_rgba(47,62,64,0.05)] transition-colors hover:border-primary/35" onClick={() => setViewSOP(sop)}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-heading font-bold text-foreground">{sop.title}</h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Badge variant="outline" className="capitalize text-xs">{sop.category}</Badge>
                    <Badge variant="outline" className={`text-xs ${sop.status === "active" ? "bg-green-500/10 text-green-400 border-green-500/20" : sop.status === "draft" ? "bg-gray-500/10 text-gray-400" : "bg-orange-500/10 text-orange-400"}`}>{sop.status}</Badge>
                    <span className="text-xs text-muted-foreground">v{sop.version}</span>
                  </div>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => e.stopPropagation()}><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {sop.status === "draft" && <DropdownMenuItem onClick={async (e) => { e.stopPropagation(); if(user) { await sopService.approve(sop.id, user.id); toast.success("SOP approved"); mutate(); } }}><CheckCircle className="w-4 h-4 mr-2 text-green-400" /> Approve</DropdownMenuItem>}
                      {sop.status === "active" && <DropdownMenuItem onClick={async (e) => { e.stopPropagation(); await sopService.archive(sop.id); toast.success("SOP archived"); mutate(); }}><Archive className="w-4 h-4 mr-2" /> Archive</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{sop.content.substring(0, 150)}...</p>
              <p className="text-xs text-muted-foreground mt-2">By {sop.created_by_name || "Unknown"}</p>
            </div>
          ))}
        </div>
      )}

      {/* View SOP Dialog */}
      <Dialog open={!!viewSOP} onOpenChange={() => setViewSOP(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-[0.12em]">{viewSOP?.title}</DialogTitle>
            <DialogDescription className="capitalize">{viewSOP?.category} — v{viewSOP?.version}</DialogDescription>
          </DialogHeader>
          <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{viewSOP?.content}</div>
        </DialogContent>
      </Dialog>

      {/* Create SOP Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl border-border bg-card">
          <DialogHeader><DialogTitle className="font-heading uppercase tracking-[0.12em]">New SOP</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Title *</Label><Input className="border-border/80 bg-background/80" value={formData.title} onChange={e => setFormData(d => ({ ...d, title: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(d => ({ ...d, category: v }))}>
                <SelectTrigger className="border-border/80 bg-background/80"><SelectValue /></SelectTrigger>
                <SelectContent className="border-border bg-popover">{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Version</Label><Input className="border-border/80 bg-background/80" value={formData.version} onChange={e => setFormData(d => ({ ...d, version: e.target.value }))} /></div>
            <div className="space-y-2 col-span-full"><Label>Content *</Label><Textarea className="border-border/80 bg-background/80" rows={12} value={formData.content} onChange={e => setFormData(d => ({ ...d, content: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate} disabled={saving || !formData.title || !formData.content}>{saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Create SOP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
