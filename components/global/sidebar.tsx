"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/auth-context";
import { useAppSettings } from "@/lib/context/app-settings-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { menuItems } from "./sidebar-config";
import { SidebarMenuItem } from "./sidebar-menu-item";

// ---- Props ----

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// ---- Component ----

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const { role } = useAuth();
  const { settings } = useAppSettings();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // Derive short name and subtitle from company_name setting
  const companyName = settings?.company_name || "BP & AF Insurance Broker Pvt. Ltd.";
  const nameParts = companyName.split(" ");
  const shortName = nameParts.length >= 2
    ? nameParts.slice(0, 2).map((w: string) => w.charAt(0).toUpperCase()).join("")
    : companyName.substring(0, 2).toUpperCase();
  const brandLine1 = nameParts.length > 2 ? nameParts.slice(0, Math.min(nameParts.length, 3)).join(" ") : companyName;
  const brandLine2 = nameParts.length > 3 ? nameParts.slice(3).join(" ") : "";

  const filteredItems = menuItems.filter((item) => role && item.roles.includes(role));

  // Auto-expand submenus whose children match the current path
  const pathname = usePathname();

  useEffect(() => {
    const toExpand: string[] = [];
    for (const item of filteredItems) {
      if (item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"))) {
        toExpand.push(item.label);
      }
    }
    if (toExpand.length > 0) {
      setExpandedMenus((prev) => {
        const merged = new Set([...prev, ...toExpand]);
        return Array.from(merged);
      });
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex h-16 items-center border-b border-sidebar-border px-4 shrink-0", collapsed && "justify-center px-2")}>
        {collapsed ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-accent">
            <span className="font-cabin text-sm font-bold text-sidebar-accent-foreground">{shortName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
              <span className="font-cabin text-sm font-bold text-sidebar-accent-foreground">{shortName}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate font-cabin text-sm font-bold uppercase tracking-wider text-sidebar-foreground">
                {brandLine1}
              </p>
              {brandLine2 && (
              <p className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
                {brandLine2}
              </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Menu */}
      <ScrollArea className="flex-1 py-2">
        <nav aria-label="Main navigation" className="px-2 space-y-1">
          {filteredItems.map((item) => (
            <SidebarMenuItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              isExpanded={expandedMenus.includes(item.label)}
              onToggleSubmenu={toggleSubmenu}
              onMobileClose={onMobileClose}
              role={role}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* Collapse toggle (desktop only) */}
      <div className="hidden border-t border-sidebar-border p-2 lg:block">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2 text-xs uppercase tracking-wider">Collapse</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl shadow-[0_10px_26px_rgba(47,62,64,0.05)] transition-all duration-300 lg:flex",
          collapsed ? "w-15" : "w-62.5"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-70 border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl lg:hidden"
            >
              {/* Close button */}
              <div className="absolute top-4 right-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMobileClose}
                  className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  aria-label="Close navigation"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
