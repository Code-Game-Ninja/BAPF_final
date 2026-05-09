"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Search,
  KeyRound,
  Copy,
  Check,
  Shield,
  Eye,
  EyeOff,
  RefreshCw,
  Loader2,
  Pencil,
  UserX,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { staggerContainer, staggerItem } from "@/lib/helpers/animations";
import { useIsMobile } from "@/lib/hooks/use-media-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import {
  useCollection,
} from "@/lib/hooks/use-supabase-query";
import { useCustomers } from "@/lib/hooks/use-customers";
import type { Customer } from "@/lib/types";

interface PortalUser {
  id: string;
  customer_id: string;
  auth_user_id: string;
  name: string;
  email: string;
  phone: string;
  portal_password?: string;
  is_active: boolean;
  first_login: boolean;
  created_at: string | null;
  password_changed_at?: string | null;
  created_by: string;
}

const PAGE_SIZE = 20;

export default function CustomerCredentialsPage() {
  const { role } = useAuth();

  // Only admin can see this page
  if (role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 gap-4">
        <Shield className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
      </div>
    );
  }

  return <CredentialsList />;
}

function CredentialsList() {
  const { session } = useAuth();
  const { data: portalUsers, isLoading } =
    useCollection<PortalUser>(
      "portal-users-all",
      "customer_portal_users",
      undefined,
      "created_at",
      "desc"
    );

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  // Toggle access loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleAccess = useCallback(
    async (pu: PortalUser) => {
      setTogglingId(pu.id);
      try {
        const token = session?.access_token;
        if (!token) throw new Error("No auth token");
        const action = pu.is_active ? "disable" : "enable";
        const res = await fetch("/api/customers/portal-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ portalUserId: pu.id, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        toast.success(data.message);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update portal access");
      } finally {
        setTogglingId(null);
      }
    },
    [session]
  );

  // Change password dialog state
  const [changePwDialogOpen, setChangePwDialogOpen] = useState(false);
  const [changePwUser, setChangePwUser] = useState<PortalUser | null>(null);
  const [changePwValue, setChangePwValue] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);

  // Generate credentials dialog state
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateSearch, setGenerateSearch] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const { data: allCustomers } = useCustomers();

  // Customers without portal accounts
  const portalCustomerIds = useMemo(
    () => new Set(portalUsers?.map((pu) => pu.customer_id) ?? []),
    [portalUsers]
  );

  const customersWithoutPortal = useMemo(() => {
    if (!allCustomers) return [];
    const list = allCustomers.filter((c) => !portalCustomerIds.has(c.id));
    if (!generateSearch.trim()) return list;
    const q = generateSearch.toLowerCase();
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
    );
  }, [allCustomers, portalCustomerIds, generateSearch]);

  const handleGenerateCredentials = useCallback(
    async (customer: Customer) => {
      setGenerateLoading(true);
      try {
        const token = session?.access_token;
        if (!token) throw new Error("No auth token");
        if (!customer.email) throw new Error("Customer has no email address");

        const res = await fetch("/api/customers/create-portal-account", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customerId: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone || "",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create portal account");
        if (data.existing) {
          toast.info("Portal account already exists for this customer");
        } else {
          toast.success(`Portal credentials generated for ${customer.name}`);
        }
        setGenerateDialogOpen(false);
        setGenerateSearch("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to generate credentials");
      } finally {
        setGenerateLoading(false);
      }
    },
    [session]
  );

  // Filter
  const filtered = useMemo(() => {
    if (!portalUsers) return [];
    if (!searchQuery.trim()) return portalUsers;
    const q = searchQuery.toLowerCase();
    return portalUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone?.includes(q)
    );
  }, [portalUsers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyCredentials = async (pu: PortalUser) => {
    const pwd = pu.portal_password || "(not available)";
    const text = `Customer Portal Login\nName: ${pu.name}\nEmail: ${pu.email}\nPassword: ${pwd}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(pu.id);
    toast.success("Credentials copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyEmail = async (email: string, id: string) => {
    await navigator.clipboard.writeText(email);
    setCopiedId(id);
    toast.success("Email copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openChangePassword = (pu: PortalUser) => {
    setChangePwUser(pu);
    setChangePwValue("");
    setShowChangePw(false);
    setChangePwDialogOpen(true);
  };

  const handleChangePassword = useCallback(async (generateNew: boolean) => {
    if (!changePwUser) return;
    setChangePwLoading(true);
    try {
      const token = session?.access_token;
      if (!token) throw new Error("No auth token");

      const res = await fetch("/api/customers/portal-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          portalUserId: changePwUser.id,
          ...(generateNew ? {} : { newPassword: changePwValue }),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      toast.success("Password changed successfully");
      setChangePwDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setChangePwLoading(false);
    }
  }, [changePwUser, changePwValue, session]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider flex items-center gap-3">
            <KeyRound className="w-6 h-6 text-primary" />
            Portal Credentials
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length} portal account
            {filtered.length !== 1 ? "s" : ""}{" "}
            {searchQuery && "found"} — Admin only
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setGenerateSearch("");
            setGenerateDialogOpen(true);
          }}
        >
          <UserPlus className="w-4 h-4" />
          Generate Credentials
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
        />
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <KeyRound className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">
            {searchQuery
              ? "No portal accounts match your search."
              : "No customer portal accounts created yet."}
          </p>
        </div>
      ) : isMobile ? (
        /* Mobile: Card view */
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          {paginated.map((pu) => (
            <motion.div
              key={pu.id}
              variants={staggerItem}
              className="bg-card border border-border rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-heading font-bold text-foreground">
                    {pu.name}
                  </p>
                  <p className="text-sm text-muted-foreground">{pu.email}</p>
                </div>
                <Badge
                  variant={pu.is_active ? "default" : "destructive"}
                  className="text-xs"
                >
                  {pu.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="grid grid-cols-1 gap-1.5 text-sm text-muted-foreground">
                {pu.phone && <p>Phone: {pu.phone}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-xs">Password:</span>
                  <span className="font-mono text-sm text-foreground">
                    {visiblePasswords.has(pu.id)
                      ? pu.portal_password || "—"
                      : "••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(pu.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {visiblePasswords.has(pu.id) ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p>
                  Created:{" "}
                  {pu.created_at
                    ? new Date(pu.created_at).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleCopyCredentials(pu)}
                >
                  {copiedId === pu.id ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedId === pu.id ? "Copied!" : "Copy All"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => openChangePassword(pu)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Change Password
                </Button>
                <Button
                  variant={pu.is_active ? "destructive" : "default"}
                  size="sm"
                  className="flex-1 gap-2"
                  disabled={togglingId === pu.id}
                  onClick={() => handleToggleAccess(pu)}
                >
                  {togglingId === pu.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : pu.is_active ? (
                    <UserX className="w-3.5 h-3.5" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5" />
                  )}
                  {pu.is_active ? "Disable Login" : "Enable Login"}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        /* Desktop: Table */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Name
                </TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Email
                </TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Password
                </TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Phone
                </TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Status
                </TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Created
                </TableHead>
                <TableHead className="font-heading uppercase tracking-wider text-xs">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((pu) => (
                <TableRow key={pu.id} className="group">
                  <TableCell className="font-medium">{pu.name}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleCopyEmail(pu.email, pu.id)}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      {pu.email}
                      {copiedId === pu.id ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">
                        {visiblePasswords.has(pu.id)
                          ? pu.portal_password || "—"
                          : "••••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(pu.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {visiblePasswords.has(pu.id) ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {pu.phone || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pu.is_active ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {pu.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {pu.created_at
                      ? new Date(pu.created_at).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => handleCopyCredentials(pu)}
                        title="Copy credentials"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                        onClick={() => openChangePassword(pu)}
                        title="Change password"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-1 ${
                          pu.is_active
                            ? "text-destructive hover:text-destructive"
                            : "text-green-600 hover:text-green-600"
                        }`}
                        disabled={togglingId === pu.id}
                        onClick={() => handleToggleAccess(pu)}
                        title={pu.is_active ? "Disable portal login" : "Enable portal login"}
                      >
                        {togglingId === pu.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : pu.is_active ? (
                          <UserX className="w-3.5 h-3.5" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Change Password Dialog */}
      <Dialog open={changePwDialogOpen} onOpenChange={setChangePwDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">
              Change Portal Password
            </DialogTitle>
            <DialogDescription>
              Change the portal login password for{" "}
              <strong>{changePwUser?.name}</strong> ({changePwUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs uppercase tracking-wider font-heading">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showChangePw ? "text" : "password"}
                  placeholder="Enter new password or leave empty to auto-generate"
                  value={changePwValue}
                  onChange={(e) => setChangePwValue(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowChangePw(!showChangePw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showChangePw ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Leave empty to generate a random secure password. Minimum 6 characters if setting manually.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handleChangePassword(true)}
              disabled={changePwLoading}
              className="gap-2"
            >
              {changePwLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Generate New
            </Button>
            <Button
              onClick={() => handleChangePassword(false)}
              disabled={changePwLoading || (changePwValue.length > 0 && changePwValue.length < 6)}
              className="gap-2"
            >
              {changePwLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
              {changePwValue.trim() ? "Set Password" : "Generate New"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Credentials Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading uppercase tracking-wider">
              Generate Portal Credentials
            </DialogTitle>
            <DialogDescription>
              Select a customer who doesn&apos;t have portal credentials yet.
              A secure password will be auto-generated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customer by name, email, phone..."
                value={generateSearch}
                onChange={(e) => setGenerateSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[40vh]">
              {customersWithoutPortal.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {generateSearch
                    ? "No matching customers found without portal credentials."
                    : "All customers already have portal credentials."}
                </p>
              ) : (
                customersWithoutPortal.slice(0, 50).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.email || "No email"}{c.phone ? ` · ${c.phone}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="gap-1.5 shrink-0"
                      disabled={generateLoading || !c.email}
                      onClick={() => handleGenerateCredentials(c)}
                      title={!c.email ? "Customer needs an email to create portal account" : ""}
                    >
                      {generateLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5" />
                      )}
                      Generate
                    </Button>
                  </div>
                ))
              )}
              {customersWithoutPortal.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing 50 of {customersWithoutPortal.length} — use search to narrow down.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
