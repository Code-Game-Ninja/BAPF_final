"use client";

import { motion } from "framer-motion";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface CustomerCreatedSuccessProps {
  uid: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
  portalCreated?: boolean;
}

export function CustomerCreatedSuccess({
  uid,
  copied,
  onCopy,
  onClose,
  portalCreated,
}: CustomerCreatedSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-4 py-6"
    >
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
        <Check className="w-8 h-8 text-green-400" />
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">Customer UID</p>
        <p className="text-3xl font-cabin font-bold text-primary tracking-widest">
          {uid}
        </p>
      </div>
      <Button variant="outline" onClick={onCopy} className="gap-2">
        {copied ? (
          <Check className="w-4 h-4" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        {copied ? "Copied!" : "Copy UID"}
      </Button>

      {/* Portal Account Note */}
      {portalCreated && (
        <div className="w-full mt-2 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              Portal Account Created
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Login credentials have been generated. View and manage them in the
              Portal Credentials page.
            </p>
          </div>
          <div className="px-4 pb-3">
            <Link href="/dashboard/customers/credentials">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <KeyRound className="w-3.5 h-3.5" />
                Go to Portal Credentials
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Button variant="ghost" onClick={onClose} className="text-sm">
        Close
      </Button>
    </motion.div>
  );
}
