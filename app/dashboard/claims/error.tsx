"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import * as Sentry from "@sentry/nextjs";

export default function ModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[ModuleError]", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-red-900/30 p-4 mb-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>
      <h2 className="font-cabin text-xl font-semibold text-foreground mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        An error occurred while loading this section. Please try again or go back.
      </p>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back
        </Button>
        <Button
          onClick={reset}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </div>
    </div>
  );
}
