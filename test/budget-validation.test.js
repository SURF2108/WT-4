"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseAmountCents,
  validateBudget,
  validateTransaction,
} = require("../lib/budget-validation");

test("parses decimal amounts into exact cents", () => {
  assert.equal(parseAmountCents("1234.5"), 123450);
  assert.equal(parseAmountCents("0.01"), 1);
  assert.equal(parseAmountCents("0"), null);
  assert.equal(parseAmountCents("0", true), 0);
  assert.equal(parseAmountCents("1.234"), null);
  assert.equal(parseAmountCents("01.00"), null);
});

test("accepts a valid expense and derives its month", () => {
  const result = validateTransaction({
    description: "  Groceries  ",
    type: "expense",
    category: "Food",
    amount: "42.75",
    date: "2026-11-17",
  });

  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.transaction, {
    description: "Groceries",
    type: "expense",
    category: "Food",
    amountCents: 4275,
    date: "2026-11-17",
    month: "2026-11",
  });
});

test("rejects invalid transaction fields", () => {
  const result = validateTransaction({
    description: "x",
    type: "expense",
    category: "Salary",
    amount: "-10",
    date: "2026-02-30",
  });

  assert.deepEqual(Object.keys(result.errors).sort(), [
    "amount",
    "category",
    "date",
    "description",
  ]);
});

test("accepts zero budgets and rejects invalid months or amounts", () => {
  assert.deepEqual(validateBudget({ month: "2026-11", amount: "0" }), {
    errors: {},
    budget: { month: "2026-11", amountCents: 0 },
  });
  assert.deepEqual(
    Object.keys(validateBudget({ month: "2026-13", amount: "1.999" }).errors).sort(),
    ["amount", "month"],
  );
});
