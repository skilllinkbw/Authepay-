import { test } from "node:test";
import assert from "node:assert/strict";
import { toMinorUnits, fromMinor } from "../lib/money.ts";
import { MoneyError } from "../lib/errors.ts";

test("converts decimal amounts to minor units", () => {
  assert.equal(toMinorUnits("12.34"), 1234);
  assert.equal(toMinorUnits("0.01"), 1);
  assert.equal(toMinorUnits("100"), 10000);
  assert.equal(toMinorUnits(7.5), 750);
  assert.equal(toMinorUnits("0"), 0);
});

test("rejects malformed amounts", () => {
  assert.throws(() => toMinorUnits("-5"), MoneyError);
  assert.throws(() => toMinoreHelper(), MoneyError);
  assert.throws(() => toMinorUnits("abc"), MoneyError);
  assert.throws(() => toMinorUnits(""), MoneyError);
  assert.throws(() => toMinorUnits("1.999"), MoneyError); // >2 decimals
  assert.throws(() => toMinorUnits("NaN"), MoneyError);
});

function toMinoreHelper(): number {
  return toMinorUnits("1.2.3");
}

test("formats minor units back to decimal strings", () => {
  assert.equal(fromMinor(1234), "12.34");
  assert.equal(fromMinor(1), "0.01");
  assert.equal(fromMinor(10000), "100.00");
  assert.equal(fromMinor(-150), "-1.50");
});

test("round trip is exact", () => {
  const samples = ["0", "0.05", "9.99", "125000.25"];
  for (const s of samples) {
    assert.equal(fromMinor(toMinorUnits(s)), Number(s).toFixed(2));
  }
});