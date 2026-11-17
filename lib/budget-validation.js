"use strict";

const EXPENSE_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Entertainment",
  "Shopping",
  "Education",
  "Personal",
  "Other",
];

const INCOME_CATEGORIES = ["Salary", "Freelance", "Investment", "Gift", "Other"];
const MAX_AMOUNT_CENTS = 99_999_999_999;

function isValidMonth(month) {
  return typeof month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function isValidDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === date;
}

function parseAmountCents(amount, allowZero = false) {
  if (typeof amount !== "string" || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(amount)) {
    return null;
  }
  const [whole, fraction = ""] = amount.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents > MAX_AMOUNT_CENTS || (!allowZero && cents === 0)) {
    return null;
  }
  return cents;
}

function validateTransaction(input) {
  const data = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = {};
  const description =
    typeof data.description === "string" ? data.description.trim() : "";
  const type = data.type;
  const category = data.category;
  const date = data.date;
  const amountCents = parseAmountCents(data.amount);

  if (description.length < 2 || description.length > 80) {
    errors.description = "Enter a description between 2 and 80 characters.";
  }
  if (type !== "expense" && type !== "income") {
    errors.type = "Choose income or expense.";
  }
  const categories =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (!categories.includes(category)) {
    errors.category = "Choose a category for this transaction.";
  }
  if (amountCents === null) {
    errors.amount = "Enter an amount greater than zero with up to 2 decimal places.";
  }
  if (!isValidDate(date)) {
    errors.date = "Enter a valid transaction date.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    transaction: {
      description,
      type,
      category,
      date,
      month: date.slice(0, 7),
      amountCents,
    },
  };
}

function validateBudget(input) {
  const data = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const errors = {};
  const amountCents = parseAmountCents(data.amount, true);

  if (!isValidMonth(data.month)) {
    errors.month = "Choose a valid month.";
  }
  if (amountCents === null) {
    errors.amount = "Enter a budget from 0 to 999,999,999.99 with up to 2 decimal places.";
  }

  return {
    errors,
    ...(Object.keys(errors).length === 0
      ? { budget: { month: data.month, amountCents } }
      : {}),
  };
}

module.exports = {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isValidMonth,
  parseAmountCents,
  validateBudget,
  validateTransaction,
};
