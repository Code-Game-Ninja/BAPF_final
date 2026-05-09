"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Settings, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { useAuth } from "@/lib/context/auth-context";
import { pageTransition } from "@/lib/helpers/animations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = [
  "ecard_request", "member_endorsement", "name_correction", "address_correction",
  "invoice_dispute", "claim_assistance", "general_query", "validity_renewal",
  "vehicle_endorsement", "policy_query", "document_request",
];

const PRIORITIES = ["urgent", "high", "medium", "low"];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface SLAConfig {
  category: string;
  priority: string;
  sla_hours: number;
}

interface BusinessHour {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

export default function ServiceDeskSettingsPage() {
  const { session, role } = useAuth();
  const token = session?.access_token ?? "";

  const [slaConfigs, setSlaConfigs] = useState<SLAConfig[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSLA, setIsSavingSLA] = useState(false);
  const [isSavingBH, setIsSavingBH] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch("/api/service-desk/sla-config", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch("/api/service-desk/business-hours", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([sla, bh]) => {
      setSlaConfigs(sla?.data || (Array.isArray(sla) ? sla : []));
      setBusinessHours(bh?.data || bh?.business_hours || []);
      setHolidays(bh?.holidays || []);
    }).finally(() => setIsLoading(false));
  }, [token]);

  const getSLAHours = (category: string, priority: string): number => {
    return slaConfigs.find(c => c.category === category && c.priority === priority)?.sla_hours ?? 24;
  };

  const updateSLAHours = (category: string, priority: string, hours: number) => {
    setSlaConfigs(prev => {
      const existing = prev.find(c => c.category === category && c.priority === priority);
      if (existing) {
        return prev.map(c =>
          c.category === category && c.priority === priority ? { ...c, sla_hours: hours } : c
        );
      }
      return [...prev, { category, priority, sla_hours: hours }];
    });
  };

  const handleSaveSLA = async () => {
    if (!token) return;
    setIsSavingSLA(true);
    try {
      const res = await fetch("/api/service-desk/sla-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ configs: slaConfigs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("SLA configuration saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save SLA config");
    } finally {
      setIsSavingSLA(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    if (!token) return;
    setIsSavingBH(true);
    try {
      const res = await fetch("/api/service-desk/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_hours: businessHours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Business hours saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save business hours");
    } finally {
      setIsSavingBH(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDate || !token) return;
    setIsAddingHoliday(true);
    try {
      const res = await fetch("/api/service-desk/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          add_holidays: [{ name: newHolidayName, date: newHolidayDate }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHolidays(data.holidays ?? []);
      setNewHolidayName("");
      setNewHolidayDate("");
      toast.success("Holiday added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add holiday");
    } finally {
      setIsAddingHoliday(false);
    }
  };

  const handleRemoveHoliday = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch("/api/service-desk/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ remove_holiday_ids: [id] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHolidays(data.holidays ?? []);
      toast.success("Holiday removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove holiday");
    }
  };

  if (role !== "admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <motion.div {...pageTransition} className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-heading font-bold uppercase tracking-wider">
          Service Desk Settings
        </h1>
      </div>

      <Tabs defaultValue="sla">
        <TabsList>
          <TabsTrigger value="sla">SLA Configuration</TabsTrigger>
          <TabsTrigger value="business-hours">Business Hours</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        {/* SLA Config */}
        <TabsContent value="sla" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold uppercase tracking-wider">SLA Hours</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure SLA duration (hours) per category and priority.
                  Changes apply to new tickets only.
                </p>
              </div>
              <Button onClick={handleSaveSLA} disabled={isSavingSLA} className="gap-2">
                {isSavingSLA ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>

            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-xs uppercase tracking-wider text-muted-foreground font-heading">
                        Category
                      </th>
                      {PRIORITIES.map(p => (
                        <th key={p} className="text-center py-2 px-2 text-xs uppercase tracking-wider text-muted-foreground font-heading capitalize">
                          {p}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATEGORIES.map(cat => (
                      <tr key={cat} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-sm capitalize">
                          {cat.replace(/_/g, " ")}
                        </td>
                        {PRIORITIES.map(pri => (
                          <td key={pri} className="py-2 px-2 text-center">
                            <Input
                              type="number"
                              min="1"
                              max="720"
                              value={getSLAHours(cat, pri)}
                              onChange={e => updateSLAHours(cat, pri, Number(e.target.value))}
                              className="h-8 w-20 text-center text-sm mx-auto"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Business Hours */}
        <TabsContent value="business-hours" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-bold uppercase tracking-wider">Business Hours</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure working hours per day. Changes apply to new tickets only.
                </p>
              </div>
              <Button onClick={handleSaveBusinessHours} disabled={isSavingBH} className="gap-2">
                {isSavingBH ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </Button>
            </div>

            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-3">
                {DAYS.map((day, index) => {
                  const config = businessHours.find(h => h.day_of_week === index) ?? {
                    day_of_week: index,
                    start_time: "09:00",
                    end_time: "18:00",
                    is_working_day: index >= 1 && index <= 5,
                  };

                  const updateConfig = (updates: Partial<BusinessHour>) => {
                    setBusinessHours(prev => {
                      const existing = prev.find(h => h.day_of_week === index);
                      if (existing) {
                        return prev.map(h => h.day_of_week === index ? { ...h, ...updates } : h);
                      }
                      return [...prev, { ...config, ...updates }];
                    });
                  };

                  return (
                    <div key={day} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                      <div className="w-24 flex-shrink-0">
                        <span className="text-sm font-medium">{day}</span>
                      </div>
                      <Switch
                        checked={config.is_working_day}
                        onCheckedChange={v => updateConfig({ is_working_day: v })}
                      />
                      {config.is_working_day ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="time"
                            value={config.start_time}
                            onChange={e => updateConfig({ start_time: e.target.value })}
                            className="h-8 w-28 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <Input
                            type="time"
                            value={config.end_time}
                            onChange={e => updateConfig({ end_time: e.target.value })}
                            className="h-8 w-28 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Non-working day</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Holidays */}
        <TabsContent value="holidays" className="mt-4">
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div>
              <h2 className="font-heading font-bold uppercase tracking-wider">Holidays</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage public holidays. These dates are excluded from SLA calculations.
              </p>
            </div>

            {/* Add holiday */}
            <div className="flex items-end gap-3 p-4 bg-muted/20 rounded-xl">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs">Holiday Name</Label>
                <Input
                  placeholder="e.g., Republic Day"
                  value={newHolidayName}
                  onChange={e => setNewHolidayName(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={newHolidayDate}
                  onChange={e => setNewHolidayDate(e.target.value)}
                  className="h-8 w-36"
                />
              </div>
              <Button
                size="sm"
                onClick={handleAddHoliday}
                disabled={isAddingHoliday || !newHolidayName.trim() || !newHolidayDate}
                className="gap-2"
              >
                {isAddingHoliday ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </Button>
            </div>

            {/* Holiday list */}
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : holidays.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No holidays configured.</p>
            ) : (
              <div className="space-y-2">
                {holidays
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(holiday => (
                    <div
                      key={holiday.id}
                      className="flex items-center justify-between px-4 py-2 bg-muted/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {format(new Date(holiday.date), "dd MMM yyyy")}
                        </Badge>
                        <span className="text-sm">{holiday.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-400 hover:text-red-400"
                        onClick={() => handleRemoveHoliday(holiday.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
