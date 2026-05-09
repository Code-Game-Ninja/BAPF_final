"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  FileText,
  RefreshCw,
  DollarSign,
  Wallet,
  Clock,
  FolderOpen,
  Bell,
  Megaphone,
  BarChart3,
  ScrollText,
  Archive,
  Settings,
  UserCog,
  LayoutDashboard,
  Loader2,
  User,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { customerService } from "@/lib/services/customer.service";
import { policyService } from "@/lib/services/policy.service";

import { useAuth } from "@/lib/context/auth-context";

interface SearchItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  keywords?: string[];
  group: string;
  subtitle?: string;
}

const SEARCH_ITEMS: SearchItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, href: "/dashboard", group: "Navigation", keywords: ["home", "overview"] },
  { label: "Customers", icon: <Users className="w-4 h-4" />, href: "/dashboard/customers", group: "Navigation", keywords: ["clients", "people"] },
  { label: "Policies", icon: <FileText className="w-4 h-4" />, href: "/dashboard/policies", group: "Navigation", keywords: ["insurance", "coverage"] },
  { label: "Renewals", icon: <RefreshCw className="w-4 h-4" />, href: "/dashboard/renewals", group: "Navigation", keywords: ["expiry", "expiring"] },
  { label: "Premiums", icon: <DollarSign className="w-4 h-4" />, href: "/dashboard/premiums", group: "Navigation", keywords: ["payments", "billing"] },
  { label: "Commissions", icon: <Wallet className="w-4 h-4" />, href: "/dashboard/commissions", group: "Navigation", keywords: ["earnings", "payouts"] },
  { label: "Attendance", icon: <Clock className="w-4 h-4" />, href: "/dashboard/attendance", group: "Navigation", keywords: ["checkin", "checkout", "time"] },
  { label: "Documents", icon: <FolderOpen className="w-4 h-4" />, href: "/dashboard/documents", group: "Navigation", keywords: ["files", "upload"] },
  { label: "Notifications", icon: <Bell className="w-4 h-4" />, href: "/dashboard/notifications", group: "Navigation", keywords: ["alerts"] },
  { label: "Campaigns", icon: <Megaphone className="w-4 h-4" />, href: "/dashboard/campaigns", group: "Navigation", keywords: ["marketing", "whatsapp"] },
  { label: "Reports", icon: <BarChart3 className="w-4 h-4" />, href: "/dashboard/reports", group: "Navigation", keywords: ["analytics", "charts"] },
  { label: "Audit Logs", icon: <ScrollText className="w-4 h-4" />, href: "/dashboard/audit-logs", group: "Navigation", keywords: ["history", "activity"] },
  { label: "Archives", icon: <Archive className="w-4 h-4" />, href: "/dashboard/archives", group: "Navigation", keywords: ["old", "archived"] },
  { label: "User Management", icon: <UserCog className="w-4 h-4" />, href: "/dashboard/users", group: "Admin", keywords: ["team", "roles", "manage"] },
  { label: "Settings", icon: <Settings className="w-4 h-4" />, href: "/dashboard/settings", group: "Admin", keywords: ["configuration", "preferences"] },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [liveResults, setLiveResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        if (e.repeat) return;
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpenChange]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setLiveResults([]);
    }
  }, [open]);

  // Debounced live search
  useEffect(() => {
    if (query.length < 2) {
      setLiveResults([]);
      return;
    }

    // Don't search if user isn't authenticated yet
    if (!user) return;

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.toLowerCase();
        const [customers, policies] = await Promise.all([
          customerService.getAll([], "name", "asc"),
          policyService.getAll([], "createdAt", "desc"),
        ]);

        const results: SearchItem[] = [];

        // Search customers (deduplicate by UID first)
        const seenUIDs = new Set<string>();
        const uniqueCustomers = customers.filter((c) => {
          if (c.status === "inactive") return false;
          if (!c.uid) return true;
          if (seenUIDs.has(c.uid)) return false;
          seenUIDs.add(c.uid);
          return true;
        });
        const matchedCustomers = uniqueCustomers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.email?.toLowerCase().includes(q) ||
              c.phone?.includes(q) ||
              c.uid?.toLowerCase().includes(q)
          )
          .slice(0, 5);

        for (const c of matchedCustomers) {
          results.push({
            label: c.name,
            subtitle: `${c.uid} · ${c.phone || c.email || ""}`,
            icon: <User className="w-4 h-4" />,
            href: `/dashboard/customers/${c.id}`,
            group: "Customers",
          });
        }

        // Search policies
        const matchedPolicies = policies
          .filter(
            (p) =>
              p.policy_number.toLowerCase().includes(q) ||
              p.customer_name.toLowerCase().includes(q) ||
              p.policy_type.toLowerCase().includes(q) ||
              (p.insurer_name || "").toLowerCase().includes(q)
          )
          .slice(0, 5);

        for (const p of matchedPolicies) {
          results.push({
            label: p.policy_number,
            subtitle: `${p.customer_name} · ${p.policy_type}`,
            icon: <FileText className="w-4 h-4" />,
            href: `/dashboard/policies/${p.id}`,
            group: "Policies",
          });
        }

        setLiveResults(results);
      } catch {
        // Silently fail — still show navigation results
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, user]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const groups = SEARCH_ITEMS.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  // Group live results
  const liveGroups = liveResults.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, customers, policies..."
        className="font-quicksand"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          {searching ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          ) : (
            "No results found."
          )}
        </CommandEmpty>

        {/* Live data results first */}
        {Object.entries(liveGroups).map(([group, items], idx) => (
          <div key={`live-${group}`}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.subtitle || ""}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <span className="mr-2 text-primary">{item.icon}</span>
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{item.label}</span>
                    {item.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}

        {liveResults.length > 0 && <CommandSeparator />}

        {/* Static navigation items */}
        {Object.entries(groups).map(([group, items], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${item.label} ${item.keywords?.join(" ") || ""}`}
                  onSelect={() => handleSelect(item.href)}
                  className="cursor-pointer"
                >
                  <span className="mr-2 text-muted-foreground">{item.icon}</span>
                  <span className="font-quicksand text-sm uppercase tracking-wider">
                    {item.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
