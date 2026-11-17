"use strict";

function validate(form) {
  if (!form || typeof form !== "object" || Array.isArray(form)) {
    form = {};
  }

  const errors = {};
  const name = typeof form.name === "string" ? form.name.trim() : "";
  const email = typeof form.email === "string" ? form.email.trim() : "";
  const password = typeof form.password === "string" ? form.password : "";
  const confirmPassword =
    typeof form.confirmPassword === "string" ? form.confirmPassword : "";
  const age = typeof form.age === "string" ? form.age.trim() : "";

  if (name.length < 2 || name.length > 50) {
    errors.name = "Enter a name between 2 and 50 characters.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    errors.password =
      "Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.";
  }
  if (confirmPassword !== password) {
    errors.confirmPassword = "The passwords do not match.";
  }
  if (!/^\d+$/.test(age) || Number(age) < 18 || Number(age) > 120) {
    errors.age = "Enter an age between 18 and 120.";
  }

  return errors;
}

module.exports = { validate };
