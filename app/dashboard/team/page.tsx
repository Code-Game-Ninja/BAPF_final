"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UsersRound, Users, UserCheck, ChevronRight, UserPlus, UserMinus, Loader2, Sparkles, Hash } from "lucide-react";
import { useAuth } from "@/lib/context/auth-context";
import { useTeamHierarchy } from "@/lib/hooks/use-performance";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { userService } from "@/lib/services/user.service";
import { toast } from "sonner";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

type TeamMember = {
  id: string;
  name: string;
  role: string;
  designation?: string;
  mapped_manager_id?: string | null;
  mapped_bqp_id?: string | null;
  status: string;
  branch_id?: string;
};

export default function TeamPage() {
  const { role } = useAuth();
  const { data: team, isLoading, mutate } = useTeamHierarchy();
  const isAdmin = role === "admin";

  // Assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState<TeamMember | null>(null);
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);
  const [managerPickerOpen, setManagerPickerOpen] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");

  // Group by role
  const admins = (team ?? []).filter(u => u.role === "admin");
  const managers = (team ?? []).filter(u => u.role === "manager");
  const employees = (team ?? []).filter(u => u.role === "employee");

  // Build manager → employee mapping
  const managerMap: Record<string, TeamMember[]> = {};
  (team ?? []).forEach(u => {
    const managerId = u.mapped_manager_id;
    if (managerId) {
      if (!managerMap[managerId]) managerMap[managerId] = [];
      managerMap[managerId]!.push(u);
    }
  });

  // Get unassigned employees
  const assignedIds = new Set(Object.values(managerMap).flat().map(u => u?.id));
  const unassigned = employees.filter(e => !assignedIds.has(e.id));

  // Handle assign to manager
  const handleAssignToManager = async (employeeId: string, managerId: string) => {
    setAssigningUserId(employeeId);
    try {
      await userService.assignToManager(employeeId, managerId);
      toast.success("Employee assigned to manager");
      mutate(); // Refresh team data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigningUserId(null);
      setAssignDialogOpen(false);
      setSelectedManager(null);
      setManagerPickerOpen(false);
      setManagerSearch("");
    }
  };

  // Handle remove from team
  const handleRemoveFromTeam = async (employeeId: string) => {
    setAssigningUserId(employeeId);
    try {
      await userService.assignToManager(employeeId, null);
      toast.success("Employee removed from team");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove");
    } finally {
      setAssigningUserId(null);
    }
  };

  // Filter managers for picker
  const filteredManagers = managers.filter(m =>
    m.name.toLowerCase().includes(managerSearch.toLowerCase())
  );

  // Employee card with assign button
  const EmployeeCard = ({ emp, showAssignButton = false, showRemoveButton = false }: { emp: TeamMember; showAssignButton?: boolean; showRemoveButton?: boolean }) => (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/95 p-4 shadow-[0_8px_18px_rgba(47,62,64,0.05)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 shrink-0 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground flex items-center justify-center">{emp.name.charAt(0)}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{emp.name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] capitalize">{emp.role}</Badge>
            {emp.designation && <Badge variant="outline" className="text-[10px] capitalize">{emp.designation}</Badge>}
          </div>
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {showAssignButton && (
            <Popover open={managerPickerOpen && assignDialogOpen && !selectedManager} onOpenChange={(o) => { if (!o) { setAssignDialogOpen(false); setSelectedManager(null); } }}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => { setAssignDialogOpen(true); setSelectedManager(null); setManagerPickerOpen(true); setManagerSearch(""); }}
                  disabled={assigningUserId === emp.id}
                >
                  {assigningUserId === emp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3 mr-1" />}
                  Assign
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-62.5 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Search manager..." value={managerSearch} onValueChange={setManagerSearch} />
                  <CommandList className="max-h-50">
                    <CommandEmpty>No managers found</CommandEmpty>
                    <CommandGroup heading="Managers">
                      {filteredManagers.map(m => (
                        <CommandItem
                          key={m.id}
                          value={m.name}
                          onSelect={() => {
                            handleAssignToManager(emp.id, m.id);
                            setManagerPickerOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs mr-2">{m.name.charAt(0)}</div>
                          {m.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          {showRemoveButton && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
              onClick={() => handleRemoveFromTeam(emp.id)}
              disabled={assigningUserId === emp.id}
            >
              {assigningUserId === emp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3 mr-1" />}
              Remove
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <motion.div className="mx-auto max-w-7xl space-y-6" {...pageTransition}>
      <section className="relative overflow-hidden rounded-3xl border border-border-strong/70 bg-card/95 p-5 shadow-[0_18px_42px_rgba(47,62,64,0.08)] sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-14 bottom-0 h-32 w-32 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Team operations desk
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              Team Hierarchy
            </h1>
            <p className="text-sm text-muted-foreground">Manage reporting lines and assignments for all active members.</p>
          </div>
          {isAdmin && unassigned.length > 0 && (
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {unassigned.length} unassigned
            </Badge>
          )}
        </div>
      </section>

      <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Hash, label: "Total Members", value: (team ?? []).length, panel: "border-blue-500/30 bg-blue-500/10", text: "text-blue-700 dark:text-blue-300" },
          { icon: Users, label: "Admins", value: admins.length, panel: "border-red-500/30 bg-red-500/10", text: "text-red-700 dark:text-red-300" },
          { icon: UserCheck, label: "Managers", value: managers.length, panel: "border-indigo-500/30 bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-300" },
          { icon: UsersRound, label: "Unassigned", value: unassigned.length, panel: "border-amber-500/30 bg-amber-500/10", text: "text-amber-700 dark:text-amber-300" },
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

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-border-strong/70 bg-card/90 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Admins */}
          {admins.length > 0 && (
            <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-4 shadow-[0_10px_24px_rgba(47,62,64,0.06)] sm:p-5">
              <h2 className="font-heading font-bold text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500 dark:text-red-300" /> Administrators
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {admins.map(u => (
                  <motion.div key={u.id} {...hoverLift} className="rounded-xl border border-border/70 bg-card/95 p-4 shadow-[0_8px_18px_rgba(47,62,64,0.05)] border-l-4 border-l-red-500/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 font-bold text-sm">{u.name.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-foreground">{u.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400">Admin</Badge>
                          {u.designation && <Badge variant="outline" className="text-xs capitalize">{u.designation}</Badge>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* Managers & their teams */}
          {managers.length > 0 && (
            <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-4 shadow-[0_10px_24px_rgba(47,62,64,0.06)] sm:p-5">
              <h2 className="font-heading font-bold text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-500 dark:text-blue-300" /> Managers & Teams
              </h2>
              <div className="space-y-4">
                {managers.map(mgr => {
                  const teamMembers = managerMap[mgr.id] ?? [];
                  return (
                    <motion.div key={mgr.id} {...hoverLift} className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-[0_8px_18px_rgba(47,62,64,0.05)]">
                      <div className="p-4 border-b border-border border-l-4 border-l-blue-500/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-sm">{mgr.name.charAt(0)}</div>
                            <div>
                              <p className="font-medium text-foreground">{mgr.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400">Manager</Badge>
                                {mgr.designation && <Badge variant="outline" className="text-xs capitalize">{mgr.designation}</Badge>}
                                <span className="text-xs text-muted-foreground">{teamMembers.length} team member{teamMembers.length !== 1 ? "s" : ""}</span>
                              </div>
                            </div>
                          </div>
                          {isAdmin && unassigned.length > 0 && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-8 border-border/80 bg-background/80 text-xs hover:bg-muted/60">
                                  <UserPlus className="w-3 h-3 mr-1" /> Add Member
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-70 p-0" align="end">
                                <Command>
                                  <CommandInput placeholder="Search employee..." />
                                  <CommandList className="max-h-62.5">
                                    <CommandEmpty>No unassigned employees</CommandEmpty>
                                    <CommandGroup heading="Unassigned Employees">
                                      {unassigned.map(emp => (
                                        <CommandItem
                                          key={emp.id}
                                          value={emp.name}
                                          onSelect={() => handleAssignToManager(emp.id, mgr.id)}
                                          className="cursor-pointer"
                                          disabled={assigningUserId === emp.id}
                                        >
                                          <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-xs mr-2">{emp.name.charAt(0)}</div>
                                          <div className="flex-1">
                                            <p className="text-sm">{emp.name}</p>
                                            {emp.designation && <p className="text-[10px] text-muted-foreground capitalize">{emp.designation}</p>}
                                          </div>
                                          {assigningUserId === emp.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </div>
                      {teamMembers.length > 0 ? (
                        <div className="divide-y divide-border">
                          {teamMembers.map(emp => (
                            <div key={emp.id} className="group flex items-center justify-between gap-3 p-3 pl-12 transition-colors hover:bg-muted/30">
                              <div className="flex items-center gap-3 min-w-0">
                                <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground" />
                                <div className="w-8 h-8 shrink-0 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-xs font-medium">{emp.name.charAt(0)}</div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-foreground truncate">{emp.name}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] capitalize">{emp.role}</Badge>
                                    {emp.designation && <Badge variant="outline" className="text-[10px] capitalize">{emp.designation}</Badge>}
                                  </div>
                                </div>
                              </div>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-400 opacity-100 transition-opacity hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100"
                                  onClick={() => handleRemoveFromTeam(emp.id)}
                                  disabled={assigningUserId === emp.id}
                                >
                                  {assigningUserId === emp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserMinus className="w-3 h-3" />}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          No team members assigned
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Unassigned Employees */}
          {unassigned.length > 0 && (
            <section className="rounded-2xl border border-border-strong/70 bg-card/90 p-4 shadow-[0_10px_24px_rgba(47,62,64,0.06)] sm:p-5">
              <h2 className="font-heading font-bold text-foreground text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <UsersRound className="w-4 h-4 text-amber-500 dark:text-amber-300" /> Unassigned Employees
                <Badge variant="outline" className="ml-2 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">{unassigned.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassigned.map(emp => (
                  <EmployeeCard key={emp.id} emp={emp} showAssignButton={isAdmin} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {admins.length === 0 && managers.length === 0 && employees.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-strong/70 bg-card/80 py-16 text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
                <Users className="h-8 w-8" />
              </div>
              <p className="text-sm">No active team members found</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
