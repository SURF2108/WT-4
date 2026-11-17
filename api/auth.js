"use strict";

const { metric } = require("@vercel/functions");
const { apiRoute, jsonResponse, requestBody } = require("../lib/api-route");
const {
  clearSessionCookie,
  createSessionToken,
  hasValidSession,
  isAppConfigured,
  matchesAppPassword,
  sessionCookie,
} = require("../lib/session");

module.exports = apiRoute("auth", async (request) => {
  if (request.method === "GET") {
    return jsonResponse(200, {
      configured: isAppConfigured(),
      authenticated: hasValidSession(request),
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { message: "Method not allowed." }, { Allow: "GET, POST" });
  }
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    return jsonResponse(415, { message: "Send the request as JSON." });
  }

  const body = requestBody(request);
  if (body.action === "logout") {
    return jsonResponse(
      200,
      { message: "You have been signed out." },
      { "Set-Cookie": clearSessionCookie(request) },
    );
  }
  if (body.action !== "login" || typeof body.password !== "string") {
    return jsonResponse(400, { message: "Enter the app password to sign in." });
  }
  if (!isAppConfigured()) {
    metric("budget.auth.attempts", 1, { outcome: "not_configured" });
    return jsonResponse(503, {
      message: "Add the MongoDB and app security environment variables to enable sign-in.",
    });
  }
  if (!matchesAppPassword(body.password)) {
    metric("budget.auth.attempts", 1, { outcome: "rejected" });
    return jsonResponse(401, { message: "That password is not correct." });
  }

  metric("budget.auth.attempts", 1, { outcome: "success" });
  return jsonResponse(
    200,
    { message: "Signed in." },
    { "Set-Cookie": sessionCookie(request, createSessionToken()) },
  );
});
