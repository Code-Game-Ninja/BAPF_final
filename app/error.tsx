"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Root page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-foreground">
      <div className="relative">
        <div className="absolute -inset-1 rounded-full bg-red-500/20 blur-xl animate-pulse" />
        <div className="relative h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <AlertCircle className="h-10 w-10 text-red-500" />
        </div>
      </div>

      <div className="mt-8 text-center space-y-3 max-w-md">
        <h2 className="text-2xl font-bold tracking-tight">System Initialization Error</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The application encountered a critical error during startup. This might be due to a configuration mismatch or a temporary service interruption.
        </p>
        
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-4 rounded-xl bg-muted/50 border border-border text-left overflow-auto max-h-40">
            <p className="font-mono text-[10px] text-red-400 whitespace-pre-wrap">
              {error.message || "Unknown error"}
              {error.stack && `\n\n${error.stack}`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => reset()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 rounded-xl h-12"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Retry Startup
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = "/"}
          className="border-border hover:bg-muted font-bold px-8 rounded-xl h-12"
        >
          <Home className="mr-2 h-4 w-4" />
          Reset App
        </Button>
      </div>

      <p className="mt-8 text-[11px] text-muted-foreground uppercase tracking-widest font-medium opacity-50">
        BP & AF Insurance Broker Management System
      </p>
    </div>
  );
}
