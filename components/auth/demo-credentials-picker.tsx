"use client";

import { toast } from "sonner";
import { UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";

// Demo credentials — dev only (stripped in production bundle).
// Passwords are read from env vars set in .env.local.
const DEMO_CREDENTIALS =
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD
    ? {
        admin: { email: "admin@bpaf.in", password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD },
        manager: { email: "manager@bpaf.in", password: process.env.NEXT_PUBLIC_DEMO_MANAGER_PASSWORD || "" },
        employee: { email: "employee@bpaf.in", password: process.env.NEXT_PUBLIC_DEMO_EMPLOYEE_PASSWORD || "" },
      }
    : null;

interface DemoCredentialsPickerProps {
  setValue: UseFormSetValue<{ email: string; password: string }>;
  disabled?: boolean;
}

export function DemoCredentialsPicker({ setValue, disabled }: DemoCredentialsPickerProps) {
  if (!DEMO_CREDENTIALS) return null;

  const fillDemo = (role: "admin" | "manager" | "employee") => {
    const creds = DEMO_CREDENTIALS[role];
    setValue("email", creds.email);
    setValue("password", creds.password);
    toast.info(`Demo ${role} credentials filled`);
  };

  return (
    <div className="mt-6 pt-4 border-t border-muted-foreground/20">
      <p className="text-xs text-muted-foreground text-center mb-3 uppercase tracking-wider font-cabin">
        Demo Mode
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(["admin", "manager", "employee"] as const).map((role) => (
          <Button
            key={role}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fillDemo(role)}
            disabled={disabled}
            className="border-muted-foreground/30 text-foreground/70 hover:bg-primary/10 hover:border-primary/40 hover:text-primary uppercase text-xs font-cabin"
          >
            {role}
          </Button>
        ))}
      </div>
    </div>
  );
}
