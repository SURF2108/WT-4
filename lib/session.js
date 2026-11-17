"use strict";

const {
  createHmac,
  timingSafeEqual,
} = require("node:crypto");

const COOKIE_NAME = "budget_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

function isAppConfigured() {
  return (
    typeof process.env.MONGODB_URI === "string" &&
    process.env.MONGODB_URI.length > 0 &&
    typeof process.env.APP_PASSWORD === "string" &&
    process.env.APP_PASSWORD.length >= 16 &&
    typeof process.env.SESSION_SECRET === "string" &&
    Buffer.byteLength(process.env.SESSION_SECRET, "utf8") >= 32
  );
}

function sign(payload) {
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(payload)
    .digest("base64url");
}

function createSessionToken(now = Date.now()) {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function getCookieValue(request, name) {
  const cookieHeader = request.headers?.cookie;
  if (typeof cookieHeader !== "string") {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) {
      return valueParts.join("=");
    }
  }
  return null;
}

function hasValidSession(request, now = Date.now()) {
  if (!process.env.SESSION_SECRET) {
    return false;
  }
  const token = getCookieValue(request, COOKIE_NAME);
  if (!token) {
    return false;
  }

  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) {
    return false;
  }

  const expected = Buffer.from(sign(payload), "base64url");
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(session.exp) && session.exp > Math.floor(now / 1000);
  } catch {
    return false;
  }
}

function matchesAppPassword(candidate) {
  if (typeof process.env.APP_PASSWORD !== "string" || typeof candidate !== "string") {
    return false;
  }
  const expected = Buffer.from(process.env.APP_PASSWORD, "utf8");
  const actual = Buffer.from(candidate, "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function sessionCookie(request, token, maxAge = SESSION_TTL_SECONDS) {
  const forwardedProtocol = request.headers?.["x-forwarded-proto"];
  const isSecure =
    process.env.NODE_ENV === "production" ||
    (typeof forwardedProtocol === "string" &&
      forwardedProtocol.split(",")[0].trim() === "https");
  return `${COOKIE_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${isSecure ? "; Secure" : ""}`;
}

function clearSessionCookie(request) {
  return sessionCookie(request, "", 0);
}

module.exports = {
  clearSessionCookie,
  createSessionToken,
  hasValidSession,
  isAppConfigured,
  matchesAppPassword,
  sessionCookie,
};
