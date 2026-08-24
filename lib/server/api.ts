/**
 * Shared helpers for Next.js route handlers.
 * Keeps authorization, validation and error mapping in one place so routes
 * stay thin and consistent.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ApiError,
  badRequest,
  forbidden,
  unauthorized,
} from "../errors.ts";
import { isValidRole, type Role } from "../types.ts";
import { logger } from "../logger.ts";

export interface AuthedContext {
  supabase: SupabaseClient;
  userId: string;
  email: string | null;
  role: Role;
}

const MAX_JSON_BODY_BYTES = 1_048_576; // 1 MB

export async function readJsonBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw badRequest("Expected an application/json body", "unsupported_media_type");
  }
  const buf = await request.arrayBuffer();
  if (buf.byteLength > maxBytes) {
    throw badRequest("Request body too large", "payload_too_large");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(buf));
  } catch {
    throw badRequest("Malformed JSON body");
  }
  return parsed as T;
}

export function getClientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get("user-agent");
}

/** Resolve the authenticated user + canonical role from the server session. */
export async function getAuthedContext(supabase: SupabaseClient): Promise<AuthedContext> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) throw unauthorized();

  // Role is canonicalised server-side from profiles, never trusted from the JWT.
  let role: Role = "customer";
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();
  if (isValidRole(profile?.role)) role = profile!.role;

  return {
    supabase,
    userId: data.user.id,
    email: data.user.email ?? null,
    role,
  };
}

export async function requireRole(
  supabase: SupabaseClient,
  allowed: readonly Role[]
): Promise<AuthedContext> {
  const ctx = await getAuthedContext(supabase);
  if (!allowed.includes(ctx.role)) throw forbidden();
  return ctx;
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

export function fail(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  logger.error("Unhandled API error", { message });
  return NextResponse.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 }
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface Pagination {
  limit: number;
  offset: number;
}

export function paginationFromUrl(url: string): Pagination {
  const parsed = new URL(url);
  const limitRaw = Number.parseInt(parsed.searchParams.get("limit") ?? "50", 10);
  const offsetRaw = Number.parseInt(parsed.searchParams.get("offset") ?? "0", 10);
  return {
    limit: clamp(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50, 1, 100),
    offset: clamp(Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0, 0, 100_000),
  };
}

/** Validate that a value is a non-empty string within a length range. */
export function requireString(
  value: unknown,
  field: string,
  minLength = 1,
  maxLength = 255
): string {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw badRequest(`'${field}' is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw badRequest(`'${field}' must be at most ${maxLength} characters`);
  }
  return trimmed;
}

/** Validate a Botswana phone number-ish shape (+267…). */
export function requirePhone(value: unknown, field = "phone"): string {
  const phone = requireString(value, field, 6, 32);
  if (!/^\+?[0-9 ()-]{6,31}$/.test(phone)) {
    throw badRequest(`'${field}' is not a valid phone number`);
  }
  return phone;
}

export function optionalString(
  value: unknown,
  field: string,
  maxLength = 512
): string | null {
  if (value === undefined || value === null || value === "") return null;
  const s = requireString(value, field, 1, maxLength);
  return s;
}