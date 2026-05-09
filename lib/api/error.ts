/**
 * lib/api/error.ts
 * Shared error handling utilities for Next.js API routes.
 *
 * Usage:
 *   } catch (err: unknown) {
 *     return errorResponse(err);
 *   }
 */

import { NextResponse } from "next/server";

/**
 * Safely extract a message string from an unknown thrown value.
 * Covers: Error instances, Supabase error objects, plain strings, and unknowns.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as Record<string, unknown>).message === "string"
  ) {
    return (err as Record<string, unknown>).message as string;
  }
  if (typeof err === "string") return err;
  return "Internal server error";
}

/**
 * Returns a JSON NextResponse with the error message and given status.
 * Default status is 500.
 *
 * @example
 * } catch (err: unknown) {
 *   return errorResponse(err);
 * }
 */
export function errorResponse(
  err: unknown,
  status = 500
): NextResponse {
  const message = getErrorMessage(err);
  console.error("[API Error]", err);
  return NextResponse.json({ error: message }, { status });
}

/**
 * Returns a 400 Bad Request response with a validation message.
 */
export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Returns a 401 Unauthorized response.
 */
export function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Returns a 403 Forbidden response.
 */
export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Returns a 404 Not Found response.
 */
export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ error: message }, { status: 404 });
}
