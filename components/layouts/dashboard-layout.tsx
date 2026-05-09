"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/context/auth-context";
import { AppSettingsProvider } from "@/lib/context/app-settings-context";
import { Sidebar } from "@/components/global/sidebar";
import { Navbar } from "@/components/global/navbar";
import { GlobalSearch } from "@/components/global/search";
import { Breadcrumbs } from "@/components/global/breadcrumbs";
import { DailyReminderPopup } from "@/components/global/daily-reminder-popup";
import { EarlyCheckoutAutoLogout } from "@/components/attendance/early-checkout-auto-logout";
import { ErrorBoundary } from "@/components/error-boundary";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const isMobile = useIsMobile();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Global search shortcut fallback for reliable Ctrl/Cmd+K behavior
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (event.repeat) return;
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen bg-background text-foreground" role="status" aria-label="Loading dashboard">
        <span className="sr-only">Loading dashboard…</span>
        {/* Skeleton sidebar */}
        <div className="hidden w-62.5 flex-col gap-4 border-r border-border bg-card/80 p-4 lg:flex">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-6 w-full" />
        </div>
        <div className="flex-1 flex flex-col">
          {/* Skeleton navbar */}
          <div className="flex h-16 items-center gap-4 border-b border-border bg-card/75 px-4">
            <Skeleton className="h-9 w-64" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
          {/* Skeleton content */}
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated — show nothing while redirecting
  if (!user) return null;

  const sidebarWidth = sidebarCollapsed ? 60 : 250;

  return (
    <AppSettingsProvider>
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-1/3 -right-20 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-muted/55 blur-3xl" />
      </div>

      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={isMobile ? mobileMenuOpen : false}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main content area */}
      <motion.div
        className="relative flex flex-col min-h-screen"
        animate={{
          marginLeft: isMobile ? 0 : sidebarWidth,
        }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Navbar */}
        <Navbar
          onMenuClick={() => setMobileMenuOpen(true)}
          onSearchOpen={() => setSearchOpen(true)}
        />

        {/* Page content */}
        <main id="main-content" className="flex-1 px-4 py-5 md:px-6 md:py-6 lg:px-8 lg:py-7">
          <div className="mx-auto w-full max-w-375">
            <Breadcrumbs />
            <ErrorBoundary>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </ErrorBoundary>
          </div>
        </main>
      </motion.div>

      {/* Global search */}
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Daily reminder popup (employees/managers only) */}
      <DailyReminderPopup />

      {/* Auto-logout when early checkout is approved */}
      <EarlyCheckoutAutoLogout />

      {/* Global Quick Intake FAB */}
      {!isMobile && (
        <motion.div
          className="fixed bottom-8 right-8 z-50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Button
            onClick={() => router.push("/dashboard/intake")}
            className="h-16 w-16 rounded-3xl shadow-2xl shadow-primary/40 flex items-center justify-center p-0"
            title="Create New Intake"
          >
            <Plus className="h-8 w-8 stroke-[3]" />
          </Button>
        </motion.div>
      )}
    </div>
    </AppSettingsProvider>
  );
}
