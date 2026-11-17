"use strict";

const { validate } = require("../lib/validation");

module.exports = function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "Method not allowed." });
    return;
  }

  if (!request.headers["content-type"]?.startsWith("application/json")) {
    response.status(415).json({ message: "Send the form as JSON." });
    return;
  }

  const form =
    request.body && typeof request.body === "object" && !Array.isArray(request.body)
      ? request.body
      : {};
  const errors = validate(form);

  if (Object.keys(errors).length > 0) {
    response.status(400).json({
      message: "Please correct the highlighted fields and submit again.",
      errors,
    });
    return;
  }

  response.status(200).json({
    message: "Your details passed server-side validation. Nothing was stored.",
  });
};
