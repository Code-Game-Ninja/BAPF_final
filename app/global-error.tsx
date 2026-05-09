"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center text-center p-8">
          <div className="rounded-full bg-red-900/30 p-4 mb-4">
            <AlertTriangle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            An unexpected error occurred. Please try again.
          </p>
          <Button
            onClick={reset}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
