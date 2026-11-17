"use strict";

const { metric } = require("@vercel/functions");

function apiRoute(route, action) {
  return async function handler(request, response) {
    const startedAt = performance.now();
    let result;
    try {
      result = await action(request);
    } catch (error) {
      const status =
        error.code === "MONGODB_CONFIGURATION" ||
        error.code === "DATABASE_UNAVAILABLE"
          ? 503
          : 500;
      if (status === 500) {
        console.error("Budget API request failed.", {
          route,
          errorName: error.name || "Error",
        });
      }
      result = {
        status,
        body: {
          message:
            error.code === "MONGODB_CONFIGURATION"
              ? "The budget tracker is not configured yet. Check its server environment settings."
              : status === 503
                ? "The budget database is unavailable. Check the Atlas connection and try again."
              : "The request could not be completed. Please try again.",
        },
      };
    }

    const status = result.status || 200;
    const outcome = status >= 500 ? "error" : status >= 400 ? "rejected" : "success";
    metric("budget.api.requests", 1, { route, outcome });
    metric("budget.api.duration_ms", performance.now() - startedAt, {
      route,
      outcome,
    });

    response.setHeader("Cache-Control", "no-store, private");
    response.setHeader("X-Content-Type-Options", "nosniff");
    for (const [name, value] of Object.entries(result.headers || {})) {
      response.setHeader(name, value);
    }
    return response.status(status).json(result.body || {});
  };
}

function jsonResponse(status, body, headers) {
  return { status, body, headers };
}

function requireSession(request) {
  const { hasValidSession } = require("./session");
  if (hasValidSession(request)) {
    return null;
  }
  return jsonResponse(401, { message: "Sign in to access your budget." });
}

function requireMethod(request, methods) {
  if (methods.includes(request.method)) {
    return null;
  }
  return jsonResponse(405, { message: "Method not allowed." }, {
    Allow: methods.join(", "),
  });
}

function requestBody(request) {
  return request.body && typeof request.body === "object" && !Array.isArray(request.body)
    ? request.body
    : {};
}

module.exports = {
  apiRoute,
  jsonResponse,
  requestBody,
  requireMethod,
  requireSession,
};
