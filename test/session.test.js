"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createSessionToken,
  hasValidSession,
  isAppConfigured,
  matchesAppPassword,
  sessionCookie,
} = require("../lib/session");

test("signed sessions require configuration and reject tampering or expiry", (context) => {
  const names = ["MONGODB_URI", "APP_PASSWORD", "SESSION_SECRET"];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  context.after(() => {
    for (const name of names) {
      if (previous[name] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previous[name];
      }
    }
  });

  process.env.MONGODB_URI = "mongodb://localhost:27017";
  process.env.APP_PASSWORD = "correct-horse-battery-staple";
  process.env.SESSION_SECRET = "0123456789abcdef0123456789abcdef";

  assert.equal(isAppConfigured(), true);
  assert.equal(matchesAppPassword("correct-horse-battery-staple"), true);
  assert.equal(matchesAppPassword("incorrect"), false);

  const now = Date.now();
  const token = createSessionToken(now);
  const request = { headers: { cookie: `budget_session=${token}` } };
  assert.equal(hasValidSession(request, now), true);
  assert.equal(hasValidSession(request, now + 13 * 60 * 60 * 1000), false);
  assert.equal(
    hasValidSession({
      headers: { cookie: `budget_session=${token.slice(0, -1)}x` },
    }),
    false,
  );

  const secureCookie = sessionCookie(
    { headers: { "x-forwarded-proto": "https" } },
    token,
  );
  assert.match(secureCookie, /HttpOnly/);
  assert.match(secureCookie, /SameSite=Strict/);
  assert.match(secureCookie, /Secure/);
});
