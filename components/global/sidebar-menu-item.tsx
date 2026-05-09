"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import type { MenuItem } from "./sidebar-config";

interface SidebarMenuItemProps {
  item: MenuItem;
  collapsed: boolean;
  isExpanded: boolean;
  onToggleSubmenu: (label: string) => void;
  onMobileClose: () => void;
  role?: UserRole | null;
}

export function SidebarMenuItem({
  item,
  collapsed,
  isExpanded,
  onToggleSubmenu,
  onMobileClose,
  role,
}: SidebarMenuItemProps) {
  const pathname = usePathname();
  const Icon = item.icon;

  // Filter children by role
  const visibleChildren = item.children?.filter(
    (child) => !child.roles || (role && child.roles.includes(role))
  );
  const hasChildren = visibleChildren && visibleChildren.length > 0;

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const active = isActive(item.href);

  return (
    <div>
      {hasChildren ? (
        <div className="flex items-center gap-1">
          <Link
            href={item.href}
            onClick={onMobileClose}
            className={cn(
              "flex flex-1 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-quicksand transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_20px_rgba(93,120,122,0.28)]"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? item.label : undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <span className="flex-1 text-left uppercase text-xs tracking-wider">{item.label}</span>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={() => onToggleSubmenu(item.label)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label={`Toggle ${item.label} submenu`}
            >
              <ChevronDown
                className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")}
              />
            </button>
          )}
        </div>
      ) : (
        <Link
          href={item.href}
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-quicksand transition-colors",
            active
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_20px_rgba(93,120,122,0.28)]"
              : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? item.label : undefined}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {!collapsed && (
            <span className="uppercase text-xs tracking-wider">{item.label}</span>
          )}
        </Link>
      )}

      {/* Submenu */}
      {hasChildren && !collapsed && (
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
                <div className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/80 pl-3">
                {visibleChildren!.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={onMobileClose}
                    className={cn(
                      "block px-3 py-2 rounded-md text-xs uppercase tracking-wider font-quicksand transition-colors",
                      pathname === child.href
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                    aria-current={pathname === child.href ? "page" : undefined}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
