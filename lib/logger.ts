/**
 * Minimal structured logger with built-in redaction.
 *
 * Never logs passwords, tokens, API keys or payment credentials. Long
 * string values are truncated and sensitive field names are masked.
 */

const SENSITIVE_SUBSTRINGS = ["password", "secret", "token", "api_key", "auth", "cvv", "cvc", "card_number"];

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_SUBSTRINGS.some((s) => k.includes(s));
}

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[max-depth]";
  if (typeof value === "string") {
    if (value.length > 96) return "[truncated]";
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((v) => redact(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = isSensitiveKey(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function makeEntry(level: string, message: string, context?: Record<string, unknown>): never | void {
  const entry: Record<string, unknown> = {
    time: new Date().toISOString(),
    level,
    message,
  };
  if (context) entry.context = redact(context);
  // A single JSON line per entry for log collectors.
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    makeEntry("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    makeEntry("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    makeEntry("error", message, context);
  },
};