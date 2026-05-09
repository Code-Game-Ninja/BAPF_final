// Skip Sentry instrumentation entirely in dev to cut compile time.
// The top-level `import * as Sentry` was pulling in the full SDK on every
// server request even in development — this lazy-import approach avoids that.

const isDev = process.env.NODE_ENV === "development";

export async function register() {
  if (isDev) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: (...args: unknown[]) => void = isDev
  ? () => {}
  : (...args) => {
      // Dynamic import keeps Sentry out of the dev compile graph
      void import("@sentry/nextjs").then((Sentry) =>
        (Sentry.captureRequestError as (...a: unknown[]) => void)(...args),
      );
    };
