"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  Search,
  Moon,
  Sun,
  LogOut,
  User,
  Timer,
  ChevronDown,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/global/notification-bell";

interface NavbarProps {
  onMenuClick: () => void;
  onSearchOpen: () => void;
}

export function Navbar({ onMenuClick, onSearchOpen }: NavbarProps) {
  const router = useRouter();
  const { user, role, logout, sessionCountdown } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isMac = typeof navigator !== "undefined" &&
    // @ts-expect-error — userAgentData is not yet in all TS libs
    (navigator.userAgentData?.platform === "macOS" ||
      /Mac|iPod|iPhone|iPad/.test(navigator.userAgent));

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/75 px-4 backdrop-blur-xl md:px-5 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Search button */}
      <Button
        variant="ghost"
        className="hidden h-10 max-w-xs flex-1 items-center justify-start gap-2 rounded-xl border border-border bg-muted/70 px-3 text-muted-foreground hover:text-foreground sm:flex"
        onClick={onSearchOpen}
      >
        <Search className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wider">Search...</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 items-center gap-1 rounded border border-border bg-card px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </Button>

      {/* Mobile search icon */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground sm:hidden"
        onClick={onSearchOpen}
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </Button>

      <div className="flex-1" />

      {/* Session countdown */}
      <AnimatePresence>
        {sessionCountdown !== null && sessionCountdown <= 60 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={cn(
              "hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-cabin font-bold",
              sessionCountdown <= 10
                ? "bg-rose-100 text-rose-700 animate-pulse"
                : "bg-amber-100 text-amber-700"
            )}
          >
            <Timer className="w-3.5 h-3.5" />
            {formatCountdown(sessionCountdown)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Theme toggle */}
      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      )}

      {/* Notifications */}
      <NotificationBell />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-10 items-center gap-2 rounded-xl px-2 hover:bg-muted">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs font-cabin font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:flex flex-col items-start">
              <span className="max-w-25 truncate font-cabin text-xs font-semibold text-foreground">
                {user?.name}
              </span>
              <span className="text-[10px] uppercase text-muted-foreground">
                {role}
              </span>
            </div>
            <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 rounded-xl border-border bg-popover/95 backdrop-blur">
          <div className="px-3 py-2">
            <p className="text-sm font-cabin font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/dashboard/profile")} className="cursor-pointer">
            <User className="w-4 h-4 mr-2" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-400 focus:text-red-400">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
