import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <FileQuestion className="h-10 w-10 text-muted-foreground" />
      </div>
      <h2 className="font-cabin text-xl font-semibold text-foreground mb-2">
        Page not found
      </h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        This dashboard page doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
