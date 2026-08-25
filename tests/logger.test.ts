import { test } from "node:test";
import assert from "node:assert/strict";
import { logger } from "../lib/logger.ts";

/** Capture console output for a single logger call. */
function capture(
  fn: () => void,
  method: "log" | "warn" | "error"
): unknown[] {
  const calls: unknown[] = [];
  const consoleCast = console as unknown as Record<string, unknown>;
  const original = consoleCast[method];
  (consoleCast as Record<string, unknown>)[method] = (line: unknown) => {
    calls.push(line);
  };
  try {
    fn();
  } finally {
    (consoleCast as Record<string, unknown>)[method] = original;
  }
  return calls;
}

test("redacts sensitive keys in context", () => {
  const calls = capture(
    () => logger.info("user login", { password: "s3cret", api_key: "abc", token: "xyz", user: "alice" }),
    "log"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.equal(entry.message, "user login");
  assert.equal(entry.context.password, "[redacted]");
  assert.equal(entry.context.api_key, "[redacted]");
  assert.equal(entry.context.token, "[redacted]");
  assert.equal(entry.context.user, "alice");
});

test("does not redact non-sensitive keys", () => {
  const calls = capture(
    () => logger.info("test", { count: 3, name: "alice", active: true }),
    "log"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.equal(entry.context.count, 3);
  assert.equal(entry.context.name, "alice");
  assert.equal(entry.context.active, true);
});

test("truncates long string values to 96 chars", () => {
  const longValue = "x".repeat(200);
  const calls = capture(
    () => logger.warn("big payload", { data: longValue }),
    "warn"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.equal(entry.context.data, "[truncated]");
});

test("does not truncate short string values", () => {
  const shortValue = "x".repeat(50);
  const calls = capture(
    () => logger.info("small payload", { data: shortValue }),
    "log"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.equal(entry.context.data, shortValue);
});

test("handles nested objects with redaction at all depths", () => {
  const calls = capture(
    () =>
      logger.info("nested", {
        outer: { password: "p1", normal: "ok", nested2: { secret: "s1", deep: "ok2" } },
      }),
    "log"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.equal(entry.context.outer.password, "[redacted]");
  assert.equal(entry.context.outer.normal, "ok");
  assert.equal(entry.context.outer.nested2.secret, "[redacted]");
  assert.equal(entry.context.outer.nested2.deep, "ok2");
});

test("handles arrays", () => {
  const calls = capture(
    () => logger.info("arr", { items: ["a", "b", "c"] }),
    "log"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.deepEqual(entry.context.items, ["a", "b", "c"]);
});

test("handles null and undefined values", () => {
  const calls = capture(
    () => logger.info("nulls", { a: null, b: undefined, c: "val" }),
    "log"
  );
  const entry = JSON.parse(calls[0] as string);
  assert.equal(entry.context.a, null);
  assert.equal(entry.context.b, undefined);
  assert.equal(entry.context.c, "val");
});

test("logs at different levels", () => {
  assert.equal(capture(() => logger.info("msg"), "log").length, 1);
  assert.equal(capture(() => logger.warn("msg"), "warn").length, 1);
  assert.equal(capture(() => logger.error("msg"), "error").length, 1);
});

test("entries include timestamp, level and message", () => {
  const calls = capture(() => logger.info("hello", { x: 1 }), "log");
  const entry = JSON.parse(calls[0] as string);
  assert.equal(typeof entry.time, "string");
  assert.equal(entry.level, "info");
  assert.equal(entry.message, "hello");
});
