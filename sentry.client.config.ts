import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Disable entirely in dev — Sentry client SDK adds significant memory overhead
  enabled: !isDev && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring — sample 10% in production, 0% in dev
  tracesSampleRate: isDev ? 0 : 0.1,

  // Session replay — skip in dev to save memory
  replaysSessionSampleRate: isDev ? 0 : 0.01,
  replaysOnErrorSampleRate: isDev ? 0 : 1.0,

  // Only load heavy integrations in production
  integrations: isDev
    ? []
    : [Sentry.replayIntegration(), Sentry.browserTracingIntegration()],

  // Environment tag
  environment: process.env.NODE_ENV,

  // Filter out noisy errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Network request failed",
    "Load failed",
    "ChunkLoadError",
  ],
});
