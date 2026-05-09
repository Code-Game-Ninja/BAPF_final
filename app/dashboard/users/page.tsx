"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useUsers,
  invalidateUsers,
} from "@/lib/hooks/use-settings";
import { userService } from "@/lib/services/user.service";
import { auditLogService } from "@/lib/services/audit-log.service";

import { friendlyError } from "@/lib/helpers/friendly-error";
import {
  buildCreateUserSchema,
  buildEditUserSchema,
  type CreateUserFormData,
  type EditUserFormData,
  ROLE_CONFIG,
  STATUS_CONFIG,
} from "@/lib/validations/settings";
import {
  UserCog,
  UserPlus,
  Search,
  Loader2,
  Shield,
  UserCheck,
  UserX,
  Sparkles,
  Hash,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Save,
  KeyRound,
  Upload,
} from "lucide-react";
import { UserBulkImport } from "@/components/users/user-bulk-import";
import { pageTransition, staggerContainer, staggerItem, hoverLift } from "@/lib/helpers/animations";

export default function UserManagementPage() {
  const { user: dbUser, loading: authLoading } = useAuth();
  const { settings } = useAppSettings();
  const { data: users, isLoading } = useUsers();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; email: string; role: string; phone?: string } | null>(null);

  // Build Zod schema dynamically from admin-configured password_min_length
  const dynamicSchema = useMemo(
    () => buildCreateUserSchema(settings.password_min_length),
    [settings.password_min_length]
  );

  const editSchema = useMemo(
    () => buildEditUserSchema(settings.password_min_length),
    [settings.password_min_length]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "employee",
      phone: "",
    },
  });

  const selectedRole = watch("role");

  // Edit form
  const {
    register: editRegister,
    handleSubmit: handleEditSubmit,
    setValue: setEditValue,
    watch: watchEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
  } = useForm<EditUserFormData>({
    resolver: zodResolver(editSchema),
  });

  const editSelectedRole = watchEdit("role");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!dbUser || dbUser.role !== "admin") {
    return (
      <div className="py-20 text-center">
        <Shield className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  // Filter users
  const filtered = (users || []).filter((u) => {
    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole =
      roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const totalActive = (users || []).filter((u) => u.status === "active").length;
  const totalInactive = (users || []).filter((u) => u.status === "inactive").length;
  const admins = (users || []).filter((u) => u.role === "admin").length;

  const onCreateUser = async (data: CreateUserFormData) => {
    try {
      setCreating(true);
      const payload: Parameters<typeof userService.create>[0] = {
        name: data.name,
        email: data.email,
        role: data.role,
        phone: data.phone || "",
        password: data.password,
        status: "active",
      };

      await userService.create(payload);

      toast.success(`User "${data.name}" created successfully`);
      invalidateUsers();
      if (dbUser) {
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "create", "users",
          `Created user: ${data.name} (${data.email}, role: ${data.role})`
        ).catch(() => {});
      }
      setCreateOpen(false);
      reset();
    } catch (err) {
      toast.error(friendlyError(err, "Failed to create user"));
    } finally {
      setCreating(false);
    }
  };

  const openEditDialog = (u: { id: string; name: string; email: string; role: string; phone?: string }) => {
    setEditingUser(u);
    resetEdit({
      name: u.name,
      role: u.role as EditUserFormData["role"],
      phone: u.phone || "",
      password: "",
    });
    setEditOpen(true);
  };

  const onEditUser = async (data: EditUserFormData) => {
    if (!editingUser) return;
    try {
      setEditing(true);
      const payload: Record<string, string> = {
        name: data.name,
        role: data.role,
      };
      if (data.phone) payload.phone = data.phone;
      if (data.password) payload.password = data.password;

      await userService.updateViaApi(editingUser.id, payload);

      const changes: string[] = [];
      if (data.name !== editingUser.name) changes.push(`name → ${data.name}`);
      if (data.role !== editingUser.role) changes.push(`role → ${data.role}`);
      if (data.password) changes.push("password reset");
      if (data.phone !== (editingUser.phone || "")) changes.push(`phone → ${data.phone}`);

      toast.success(`User "${data.name}" updated successfully`);
      invalidateUsers();
      if (dbUser) {
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "update", "users",
          `Edited user ${editingUser.email}: ${changes.join(", ") || "no changes"}`
        ).catch(() => {});
      }
      setEditOpen(false);
      setEditingUser(null);
    } catch (err) {
      toast.error(friendlyError(err, "Failed to update user"));
    } finally {
      setEditing(false);
    }
  };

  const toggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await userService.setStatus(userId, newStatus);
      toast.success(`User ${newStatus === "active" ? "activated" : "deactivated"}`);
      invalidateUsers();
      if (dbUser) {
        auditLogService.logAction(
          dbUser.uid || dbUser.id, dbUser.name || "", "update", "users",
          `${newStatus === "active" ? "Activated" : "Deactivated"} user ${userId}`
        ).catch(() => {});
      }
    } catch (err) {
      toast.error(friendlyError(err, "Failed to update status"));
    }
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
              Access control desk
            </div>
            <h1 className="text-2xl font-bold text-foreground font-heading uppercase tracking-[0.16em] sm:text-3xl">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage team members, access roles, and account activation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <motion.div {...hoverLift}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkImportOpen(true)}
                className="gap-2 border-border bg-background/80 text-foreground hover:bg-muted/60"
              >
                <Upload className="h-4 w-4" />
                Bulk Import
              </Button>
            </motion.div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <motion.div {...hoverLift}>
                  <Button
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Add User
                  </Button>
                </motion.div>
              </DialogTrigger>
          <DialogContent className="rounded-3xl border border-border-strong/70 bg-card">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Create New User
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a new user account with role and permissions.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleSubmit(onCreateUser)}
              className="space-y-4"
            >
              <div>
                <Label className="text-foreground">Name</Label>
                <Input
                  {...register("name")}
                  placeholder="Full name"
                  className="border-border/80 bg-background/80 text-foreground"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-foreground">Email</Label>
                <Input
                  {...register("email")}
                  type="email"
                  placeholder="user@example.com"
                  className="border-border/80 bg-background/80 text-foreground"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-foreground">Password</Label>
                <Input
                  {...register("password")}
                  type="password"
                  placeholder="Min 6 characters"
                  className="border-border/80 bg-background/80 text-foreground"
                />
                {errors.password && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <Label className="text-foreground">Role</Label>
                <Select
                  value={selectedRole}
                  onValueChange={(v) =>
                    setValue("role", v as CreateUserFormData["role"])
                  }
                >
                  <SelectTrigger className="border-border/80 bg-background/80 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                      <SelectItem
                        key={key}
                        value={key}
                        className="text-foreground"
                      >
                        {cfg.label} — {cfg.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-foreground">
                  Phone{" "}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  {...register("phone")}
                  placeholder="+91 XXXXX XXXXX"
                  className="border-border/80 bg-background/80 text-foreground"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="border-border/80 bg-background/80 text-muted-foreground"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </section>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {[
          {
            icon: Hash,
            label: "Total Users",
            value: (users || []).length,
            panel: "border-blue-500/30 bg-blue-500/10",
            text: "text-blue-700 dark:text-blue-300",
          },
          {
            icon: UserCheck,
            label: "Active",
            value: totalActive,
            panel: "border-emerald-500/30 bg-emerald-500/10",
            text: "text-emerald-700 dark:text-emerald-300",
          },
          {
            icon: UserX,
            label: "Inactive",
            value: totalInactive,
            panel: "border-zinc-500/30 bg-zinc-500/10",
            text: "text-zinc-700 dark:text-zinc-300",
          },
          {
            icon: Shield,
            label: "Admins",
            value: admins,
            panel: "border-red-500/30 bg-red-500/10",
            text: "text-red-700 dark:text-red-300",
          },
        ].map((item) => (
          <motion.div key={item.label} variants={staggerItem} {...hoverLift}>
            <Card className={item.panel}>
              <CardContent className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                      {item.label}
                    </p>
                    <p className={`mt-1 text-xl font-semibold tracking-tight ${item.text}`}>{item.value}</p>
                  </div>
                  <div className="rounded-lg border border-border/70 bg-card px-2 py-1 shadow-inner">
                    <item.icon className={`h-4 w-4 ${item.text}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border-strong/70 bg-card/90 p-3 shadow-[0_10px_24px_rgba(47,62,64,0.06)] sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-border/80 bg-background/80 pl-10 text-foreground"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full border-border/80 bg-background/80 text-foreground sm:w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent className="border-border bg-popover">
            <SelectItem value="all" className="text-foreground">
              All Roles
            </SelectItem>
            {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
              <SelectItem
                key={key}
                value={key}
                className="text-foreground"
              >
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Users Table */}
      <Card className="overflow-hidden rounded-2xl border border-border-strong/70 bg-card/95 shadow-[0_12px_28px_rgba(47,62,64,0.06)]">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filtered.length ? (
            <div className="border-dashed border-border-strong/60 bg-card/85 py-14 text-center">
              <UserCog className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/80 bg-muted/20">
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Name</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Email</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Role</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Status</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Phone</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Last Login</TableHead>
                    <TableHead className="font-heading text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const roleCfg =
                      ROLE_CONFIG[u.role as keyof typeof ROLE_CONFIG];
                    const statusCfg =
                      STATUS_CONFIG[
                        u.status as keyof typeof STATUS_CONFIG
                      ];

                    return (
                      <TableRow key={u.id} className="border-border/70 hover:bg-muted/35">
                        <TableCell className="text-foreground font-medium">
                          {u.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: `${roleCfg?.color}60`,
                              color: roleCfg?.color,
                              backgroundColor: `${roleCfg?.color}15`,
                            }}
                          >
                            {roleCfg?.label || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: `${statusCfg?.color}60`,
                              color: statusCfg?.color,
                              backgroundColor: `${statusCfg?.color}15`,
                            }}
                          >
                            {statusCfg?.label || u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.phone || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {u.lastLoginAt
                            ? new Date(u.lastLoginAt)
                                .toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {u.id !== dbUser.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                  onClick={() => openEditDialog(u)}
                                >
                                  <Pencil className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                  onClick={() =>
                                    toggleStatus(u.id, u.status)
                                  }
                                >
                                  {u.status === "active" ? (
                                    <ToggleRight className="h-4 w-4 mr-1 text-green-400" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 mr-1 text-muted-foreground" />
                                  )}
                                  {u.status === "active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="rounded-3xl border border-border-strong/70 bg-card">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editingUser ? `Editing ${editingUser.email}` : "Update user details"}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleEditSubmit(onEditUser)}
            className="space-y-4"
          >
            <div>
              <Label className="text-foreground">Name</Label>
              <Input
                {...editRegister("name")}
                placeholder="Full name"
                className="border-border/80 bg-background/80 text-foreground"
              />
              {editErrors.name && (
                <p className="text-red-400 text-sm mt-1">
                  {editErrors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-foreground">Role</Label>
              <Select
                value={editSelectedRole}
                onValueChange={(v) =>
                  setEditValue("role", v as EditUserFormData["role"])
                }
              >
                <SelectTrigger className="border-border/80 bg-background/80 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-foreground"
                    >
                      {cfg.label} — {cfg.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-foreground">
                Phone{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                {...editRegister("phone")}
                placeholder="+91 XXXXX XXXXX"
                className="border-border/80 bg-background/80 text-foreground"
              />
            </div>

            <div>
              <Label className="text-foreground flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                Reset Password
                <span className="text-muted-foreground text-xs">(leave blank to keep current)</span>
              </Label>
              <Input
                {...editRegister("password")}
                type="password"
                placeholder={`Min ${settings.password_min_length} characters`}
                className="border-border/80 bg-background/80 text-foreground"
              />
              {editErrors.password && (
                <p className="text-red-400 text-sm mt-1">
                  {editErrors.password.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="border-border/80 bg-background/80 text-muted-foreground"
                onClick={() => { setEditOpen(false); setEditingUser(null); }}
                disabled={editing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editing}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {editing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Import dialog */}
      <UserBulkImport open={bulkImportOpen} onOpenChange={setBulkImportOpen} />
    </motion.div>
  );
}
