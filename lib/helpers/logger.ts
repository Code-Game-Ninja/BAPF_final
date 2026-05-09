/**
 * Structured Logger — JSON-formatted request/response logging for API routes.
 *
 * Outputs structured JSON logs compatible with Cloud Logging, Datadog, etc.
 * No external dependencies — uses console with JSON serialization.
 *
 * @example
 * import { logger, logRequest } from "@/lib/helpers/logger";
 *
 * export async function POST(request: NextRequest) {
 *   const { end } = logRequest(request);
 *   try {
 *     // ... handler logic
 *     return end(200, { result: "ok" });
 *   } catch (err) {
 *     logger.error("Handler failed", { error: err });
 *     return end(500);
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      if (process.env.NODE_ENV !== "production") console.debug(output);
      break;
    default:
      console.log(output);
  }
}

/** Structured logger with JSON output */
export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => emit("debug", msg, meta),
};

/**
 * Log an API request and provide a helper to log the response.
 * Automatically captures method, path, duration, and status.
 */
export function logRequest(request: NextRequest) {
  const start = Date.now();
  const method = request.method;
  const path = new URL(request.url).pathname;
  const requestId = crypto.randomUUID().slice(0, 8);

  logger.info("API request", { requestId, method, path });

  return {
    requestId,

    /** Call when the response is ready to log duration + status */
    end(status: number, meta?: Record<string, unknown>): void {
      const durationMs = Date.now() - start;
      const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "info";
      emit(level, "API response", {
        requestId,
        method,
        path,
        status,
        durationMs,
        ...meta,
      });
    },
  };
}
