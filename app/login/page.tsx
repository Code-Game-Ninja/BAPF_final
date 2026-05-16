"use client";

import { useEffect, useMemo, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ChevronRight,
  CheckCircle2,
  Globe,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { supabase } from "@/lib/supabase/client";
import { ForgotPasswordDialog } from "@/components/auth/forgot-password-dialog";
import { DemoCredentialsPicker } from "@/components/auth/demo-credentials-picker";

type PortalType = "STAFF" | "CUSTOMER";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const portalContent: Record<
  PortalType,
  {
    title: string;
    description: string;
    features: string[];
    tagline: string;
  }
> = {
  STAFF: {
    title: "Corporate Admin Portal",
    description:
      "Manage insurance operations, policies, teams, and reporting from one central interface.",
    features: [
      "Policy Lifecycle Management",
      "Customer & Lead Operations",
      "Compliance & Audit Controls",
      "Analytics & Renewals",
    ],
    tagline: "Centralized Enterprise Operations",
  },
  CUSTOMER: {
    title: "Customer Wellness Hub",
    description:
      "Access your policy, track renewals, manage KYC documents, and stay connected with your advisor.",
    features: [
      "Policy & Renewal Visibility",
      "Real-Time Status Updates",
      "KYC Document Center",
      "Advisor Contact Access",
    ],
    tagline: "Your Personal Health Guardian",
  },
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const { login, user, loading: authLoading } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<PortalType>("STAFF");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const customerPortalBaseUrl = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_CUSTOMER_PORTAL_URL || "http://localhost:3001";
    return raw.replace(/\/$/, "");
  }, []);

  useEffect(() => {
    const portalParam = searchParams?.get("portal")?.toLowerCase();
    if (portalParam === "customer") {
      setSelectedPortal("CUSTOMER");
    }
  }, [searchParams]);

  const getSafeStaffRedirect = useCallback((): string => {
    const raw = searchParams?.get("redirect") || "/dashboard";
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
    return raw;
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = getSafeStaffRedirect();
    }
  }, [authLoading, user, getSafeStaffRedirect]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const handleCustomerHandoff = async () => {
    if (!customerPortalBaseUrl) {
      throw new Error("Customer portal URL is not configured. Set NEXT_PUBLIC_CUSTOMER_PORTAL_URL.");
    }

    if (typeof window !== "undefined") {
      const currentOrigin = window.location.origin.replace(/\/$/, "");
      if (currentOrigin === customerPortalBaseUrl) {
        throw new Error(
          "Customer portal URL points to this app. Set NEXT_PUBLIC_CUSTOMER_PORTAL_URL to the customer portal host."
        );
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token || !session?.refresh_token) {
      throw new Error("Customer session not available for redirect");
    }

    const callbackParams = new URLSearchParams({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      next: "/dashboard",
    });

    window.location.href = `${customerPortalBaseUrl}/auth/callback?${callbackParams.toString()}`;
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const accountType = await login(data.email, data.password);

      if (accountType === "staff") {
        toast.success("Welcome back!", {
          description: "Redirecting to admin dashboard...",
        });
        window.location.href = getSafeStaffRedirect();
        return;
      }

      toast.success("Welcome back!", {
        description: "Redirecting to customer portal...",
      });
      await handleCustomerHandoff();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Login failed. Check your credentials.";

      if (
        message.includes("auth/invalid-credential") ||
        message.includes("auth/wrong-password") ||
        message.toLowerCase().includes("invalid")
      ) {
        toast.error("Invalid credentials", {
          description: "Please check your email and password.",
        });
      } else if (message.includes("locked")) {
        toast.error("Account locked", { description: message });
      } else if (message.includes("deactivated") || message.includes("inactive")) {
        toast.error("Account inactive", { description: message });
      } else if (message.includes("not found")) {
        toast.error("Profile not found", {
          description: "No linked account exists for this login.",
        });
      } else {
        toast.error("Login failed", { description: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isLeftShift = selectedPortal === "CUSTOMER";

  return (
    <div className="min-h-screen w-full bg-background font-sans overflow-hidden selection:bg-primary/20">
      <div className="relative flex min-h-screen w-full">
        <motion.div
          animate={{ x: isLeftShift ? "100%" : "0%" }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 1,
            velocity: 0,
          }}
          className="absolute inset-0 z-0 hidden w-1/2 flex-col justify-between bg-primary p-16 text-primary-foreground lg:flex"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-foreground/20 bg-primary-foreground/10 backdrop-blur-xl shadow-2xl">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight block leading-none">BP&AF</span>
                <span className="text-[10px] uppercase tracking-widest text-primary-foreground/60 font-bold">
                  Insurance Brokers
                </span>
              </div>
            </div>

            <div className="pt-24 space-y-8 max-w-lg">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/80 backdrop-blur-md">
                  <Globe className="w-3 h-3" /> Global Servicing Standards
                </div>
                <h1 className="text-6xl font-bold leading-[1.05] tracking-tight">
                  {portalContent[selectedPortal].tagline}
                </h1>
              </div>
              <p className="text-xl font-medium leading-relaxed text-primary-foreground/75">
                {portalContent[selectedPortal].description}
              </p>
            </div>
          </div>

          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {portalContent[selectedPortal].features.map((feature) => (
                <div
                  key={feature}
                  className="flex cursor-default items-center gap-3 text-sm font-medium text-primary-foreground/70"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground/10">
                    <CheckCircle2 className="h-3 w-3 text-primary-foreground/65" />
                  </div>
                  {feature}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-primary-foreground/20 pt-10 text-[11px] font-bold uppercase tracking-widest text-primary-foreground/50">
              <p>© {new Date().getFullYear()} BP&AF Insurance Brokers Pvt. Ltd.</p>
              <div className="flex gap-6">
                <span>Privacy Policy</span>
                <span>Compliance</span>
                <span>Support Hub</span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ x: isLeftShift ? "0%" : "100%" }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 1,
          }}
          className="absolute inset-0 w-full lg:w-1/2 flex items-center justify-center p-4 md:p-8 lg:p-16 z-10"
        >
          <div className="group relative w-full max-w-md space-y-8 md:space-y-10 overflow-hidden rounded-[2.5rem] md:rounded-[3.5rem] border border-border bg-card/90 p-8 md:p-12 shadow-[0_40px_100px_rgba(0,0,0,0.03)] backdrop-blur-3xl">
            <div className="absolute top-0 right-0 p-8 h-32 w-32 bg-linear-to-br from-[#5d787a]/5 to-transparent rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />

            {/* Mobile Logo (Visible only on small screens) */}
            <div className="flex lg:hidden items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 backdrop-blur-xl shadow-2xl">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight block leading-none">BP&AF</span>
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">
                  Insurance Brokers
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                {portalContent[selectedPortal].title}
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 rounded-full bg-primary" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Authentication Hub
                </p>
              </div>
            </div>

            <div className="relative flex h-14 gap-1 overflow-hidden rounded-2xl border border-border bg-muted/40 p-1.5 shadow-inner">
              <motion.div
                layoutId="active-tab"
                className="absolute inset-y-1.5 rounded-xl border border-border bg-card shadow-sm"
                initial={false}
                transition={{ type: "spring", stiffness: 400, damping: 35, mass: 1 }}
                style={{
                  left: selectedPortal === "STAFF" ? "6px" : "50%",
                  right: selectedPortal === "STAFF" ? "50%" : "6px",
                }}
              />
              {(["STAFF", "CUSTOMER"] as PortalType[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPortal(p)}
                  className={`flex-1 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative z-10 ${
                    selectedPortal === p
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "STAFF" ? "Corporate Admin" : "Customer Access"}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="ml-1 text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                  Identity Qualifier
                </label>
                <div className="relative group/input">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all group-focus-within/input:text-primary" />
                  <input
                    id="email"
                    type="email"
                    aria-label="Email"
                    placeholder="official-id@company.com"
                    className="h-14 w-full rounded-2xl border-2 border-border bg-background/70 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-8 focus:ring-primary/10"
                    disabled={isLoading}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                  <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                    Access Key
                  </label>
                </div>
                <div className="relative group/input">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-all group-focus-within/input:text-primary" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    aria-label="Password"
                    placeholder="••••••••"
                    className="h-14 w-full rounded-2xl border-2 border-border bg-background/70 pl-12 pr-12 text-sm font-medium outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:ring-8 focus:ring-primary/10"
                    disabled={isLoading}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="group flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-xs font-black uppercase tracking-[0.15em] text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing In
                  </>
                ) : (
                  <>
                    Sign In
                    <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-col items-center gap-4 pt-2">
              {selectedPortal === "STAFF" ? (
                <>
                  <ForgotPasswordDialog />
                  <DemoCredentialsPicker setValue={setValue} disabled={isLoading} />
                </>
              ) : (
                <div className="text-center text-xs font-semibold text-muted-foreground">
                  Password reset is available after redirect to customer portal.
                </div>
              )}

              <div className="flex items-center gap-2 rounded-full border border-border bg-muted/50 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Activity className="h-3 w-3 text-muted-foreground" /> IRDAI Compliant Interface
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
