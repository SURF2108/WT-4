"use strict";

const { ObjectId } = require("mongodb");
const {
  apiRoute,
  jsonResponse,
  requestBody,
  requireMethod,
  requireSession,
} = require("../lib/api-route");
const {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isValidMonth,
  validateTransaction,
} = require("../lib/budget-validation");
const { OWNER_ID, withDatabaseOperation } = require("../lib/database");

function getMonth(request) {
  return new URL(request.url, "http://localhost").searchParams.get("month");
}

module.exports = apiRoute("transactions", async (request) => {
  const methodError = requireMethod(request, ["GET", "POST", "DELETE"]);
  if (methodError) {
    return methodError;
  }
  const sessionError = requireSession(request);
  if (sessionError) {
    return sessionError;
  }

  if (request.method === "GET") {
    const month = getMonth(request);
    if (!isValidMonth(month)) {
      return jsonResponse(400, { message: "Choose a valid month." });
    }

    const report = await withDatabaseOperation("transactions_read", (database) =>
      database.collection("transactions").aggregate([
        { $match: { ownerId: OWNER_ID, month } },
        { $sort: { date: -1, createdAt: -1 } },
        {
          $facet: {
            entries: [
              { $limit: 250 },
              {
                $project: {
                  _id: 1,
                  description: 1,
                  type: 1,
                  category: 1,
                  date: 1,
                  amountCents: 1,
                },
              },
            ],
            totals: [
              {
                $group: {
                  _id: "$type",
                  amountCents: { $sum: "$amountCents" },
                  count: { $sum: 1 },
                },
              },
            ],
            categories: [
              { $match: { type: "expense" } },
              {
                $group: {
                  _id: "$category",
                  amountCents: { $sum: "$amountCents" },
                },
              },
              { $sort: { amountCents: -1 } },
            ],
          },
        },
      ]).toArray(),
    );

    const result = report[0] || { entries: [], totals: [], categories: [] };
    const totals = Object.fromEntries(
      result.totals.map(({ _id, amountCents, count }) => [
        _id,
        { amountCents, count },
      ]),
    );
    return jsonResponse(200, {
      transactions: result.entries.map((entry) => ({
        description: entry.description,
        type: entry.type,
        category: entry.category,
        date: entry.date,
        amountCents: entry.amountCents,
        id: entry._id.toString(),
      })),
      summary: {
        incomeCents: totals.income?.amountCents || 0,
        incomeCount: totals.income?.count || 0,
        expenseCents: totals.expense?.amountCents || 0,
        expenseCount: totals.expense?.count || 0,
        categories: result.categories.map(({ _id, amountCents }) => ({
          category: _id,
          amountCents,
        })),
      },
      categoryOptions: {
        expense: EXPENSE_CATEGORIES,
        income: INCOME_CATEGORIES,
      },
      month,
    });
  }

  if (request.method === "POST") {
    if (!request.headers["content-type"]?.startsWith("application/json")) {
      return jsonResponse(415, { message: "Send the transaction as JSON." });
    }
    const { errors, transaction } = validateTransaction(requestBody(request));
    if (Object.keys(errors).length > 0) {
      return jsonResponse(400, {
        message: "Check the transaction details and try again.",
        errors,
      });
    }

    const createdAt = new Date();
    const { insertedId } = await withDatabaseOperation(
      "transaction_create",
      (database) =>
        database.collection("transactions").insertOne({
          ...transaction,
          ownerId: OWNER_ID,
          createdAt,
        }),
    );
    return jsonResponse(201, {
      transaction: {
        id: insertedId.toString(),
        ...transaction,
        createdAt: createdAt.toISOString(),
      },
      message: "Transaction added.",
    });
  }

  const id = new URL(request.url, "http://localhost").searchParams.get("id");
  if (!ObjectId.isValid(id || "")) {
    return jsonResponse(400, { message: "Choose a valid transaction." });
  }
  const deletion = await withDatabaseOperation("transaction_delete", (database) =>
    database
      .collection("transactions")
      .deleteOne({ _id: new ObjectId(id), ownerId: OWNER_ID }),
  );
  if (deletion.deletedCount === 0) {
    return jsonResponse(404, { message: "That transaction was not found." });
  }
  return jsonResponse(200, { message: "Transaction deleted." });
});
