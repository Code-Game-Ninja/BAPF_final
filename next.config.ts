import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  // ============================================================================
  // COMPILER OPTIMIZATIONS
  // ============================================================================

  compiler: {
    // Remove console logs in production (keep error + warn)
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // ============================================================================
  // IMAGE OPTIMIZATION
  // ============================================================================

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // ============================================================================
  // SERVER & PACKAGES
  // ============================================================================

  // Keep heavy server-only packages out of the client bundle
  serverExternalPackages: ["nodemailer"],

  // Output standalone for Docker/serverless when BUILD_STANDALONE is set
  output:
    process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // ============================================================================
  // TURBOPACK
  // ============================================================================

  // Turbopack configuration is handled automatically in Next.js 15+
  // We remove the explicit root override as it can cause issues with resolution
  // if the environment has parent package.json files.

  // ============================================================================
  // EXPERIMENTAL
  // ============================================================================

  experimental: {
    // Let Turbopack infer side-effect-free modules for better tree-shaking
    turbopackInferModuleSideEffects: true,
    // Optimize barrel imports for large packages
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
    ],
  },

  // ============================================================================
  // SECURITY HEADERS
  // ============================================================================

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/images/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // ============================================================================
  // REDIRECTS
  // ============================================================================

  async redirects() {
    return [
      {
        source: "/",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },

  // ============================================================================
  // GENERAL
  // ============================================================================

  // Compress responses
  compress: true,

  // Generate ETags for caching
  generateEtags: true,

  // Disable production source maps for smaller bundles
  productionBrowserSourceMaps: false,

  // Powered-by header disabled for security
  poweredByHeader: false,

  // Strict mode for React
  reactStrictMode: true,
};

// In development, skip Sentry wrapping entirely to save ~2-3 GB memory
// and reduce compile times by 50-70%.
const configWithAnalyzer = analyzer(nextConfig);

export default isDev
  ? configWithAnalyzer
  : withSentryConfig(configWithAnalyzer, {
      // Suppress source map upload warnings when SENTRY_AUTH_TOKEN is not set
      silent: !process.env.SENTRY_AUTH_TOKEN,

      // Upload source maps for better stack traces
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,

      // Tree-shake Sentry debug logs in production
      bundleSizeOptimizations: {
        excludeDebugStatements: true,
        excludeReplayIframe: true,
        excludeReplayShadowDom: true,
      },
    });
