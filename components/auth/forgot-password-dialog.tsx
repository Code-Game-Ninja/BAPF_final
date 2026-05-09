"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { authService } from "@/lib/services/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ForgotPasswordDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      await authService.sendPasswordResetEmail(email.trim());
      toast.success("Reset email sent!", {
        description: "Check your inbox for password reset instructions.",
      });
      setOpen(false);
      setEmail("");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send reset email";
      if (message.includes("auth/user-not-found") || message.includes("auth/invalid-email")) {
        toast.error("Email not found", { description: "No account exists with this email." });
      } else {
        toast.error("Failed to send reset email", { description: message });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 text-center">
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEmail(""); }}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="text-xs text-primary hover:text-primary/80 transition-colors uppercase tracking-wider font-cabin"
          >
            Forgot Password?
          </button>
        </DialogTrigger>
        <DialogContent className="bg-background border-muted-foreground/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cabin text-foreground uppercase tracking-wider">
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-foreground/80 uppercase text-xs tracking-wider font-cabin">
                Email Address
              </Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@bpaf.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleReset()}
                className="bg-primary-foreground border-muted-foreground/30 text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:ring-primary/20"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleReset}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-cabin font-bold uppercase tracking-wider"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Link
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
