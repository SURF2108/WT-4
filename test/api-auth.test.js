"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const authHandler = require("../api/auth");
const transactionsHandler = require("../api/transactions");

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("auth status reports missing configuration without exposing secrets", async () => {
  const names = ["MONGODB_URI", "APP_PASSWORD", "SESSION_SECRET"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  for (const name of names) {
    delete process.env[name];
  }
  try {
    const response = createResponse();
    await authHandler({ method: "GET", headers: {}, url: "/api/auth" }, response);
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { configured: false, authenticated: false });
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previous[name];
      }
    }
  }
});

test("transaction API requires a signed-in session before database access", async () => {
  const response = createResponse();
  await transactionsHandler(
    {
      method: "GET",
      url: "/api/transactions?month=2026-11",
      headers: {},
    },
    response,
  );
  assert.equal(response.statusCode, 401);
  assert.match(response.body.message, /Sign in/);
  assert.equal(response.headers["Cache-Control"], "no-store, private");
});
