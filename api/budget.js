"use strict";

const {
  apiRoute,
  jsonResponse,
  requestBody,
  requireMethod,
  requireSession,
} = require("../lib/api-route");
const { isValidMonth, validateBudget } = require("../lib/budget-validation");
const { OWNER_ID, withDatabaseOperation } = require("../lib/database");

function getMonth(request) {
  return new URL(request.url, "http://localhost").searchParams.get("month");
}

module.exports = apiRoute("budget", async (request) => {
  const methodError = requireMethod(request, ["GET", "PUT"]);
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
    const budget = await withDatabaseOperation("budget_read", (database) =>
      database.collection("monthly_budgets").findOne({ ownerId: OWNER_ID, month }),
    );
    return jsonResponse(200, {
      month,
      amountCents: budget?.amountCents || 0,
    });
  }

  if (!request.headers["content-type"]?.startsWith("application/json")) {
    return jsonResponse(415, { message: "Send the budget as JSON." });
  }
  const { errors, budget } = validateBudget(requestBody(request));
  if (Object.keys(errors).length > 0) {
    return jsonResponse(400, {
      message: "Check the monthly budget and try again.",
      errors,
    });
  }
  await withDatabaseOperation("budget_update", (database) =>
    database.collection("monthly_budgets").updateOne(
      { ownerId: OWNER_ID, month: budget.month },
      {
        $set: { amountCents: budget.amountCents, updatedAt: new Date() },
        $setOnInsert: { ownerId: OWNER_ID, month: budget.month },
      },
      { upsert: true },
    ),
  );
  return jsonResponse(200, {
    ...budget,
    message: "Monthly budget saved.",
  });
});
