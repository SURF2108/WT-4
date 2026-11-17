"use strict";

const form = document.querySelector("#registration-form");
const successMessage = document.querySelector("#success-message");
const formError = document.querySelector("#form-error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  successMessage.hidden = true;
  formError.hidden = true;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.setAttribute("aria-busy", "true");

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();

    for (const field of form.elements) {
      if (!field.name) {
        continue;
      }
      const message = result.errors?.[field.name] || "";
      const errorElement = document.querySelector(`#${field.name}-error`);
      field.toggleAttribute("aria-invalid", Boolean(message));
      if (message) {
        field.setAttribute("aria-describedby", errorElement.id);
      } else {
        field.removeAttribute("aria-describedby");
      }
      errorElement.textContent = message;
      errorElement.hidden = !message;
    }

    if (!response.ok) {
      formError.textContent =
        result.message || "The form could not be validated. Please try again.";
      formError.hidden = false;
      const firstInvalidField = form.querySelector('[aria-invalid="true"]');
      if (firstInvalidField) {
        firstInvalidField.focus();
      }
      return;
    }

    successMessage.textContent = result.message;
    successMessage.hidden = false;
    form.reset();
  } catch (error) {
    console.error("Registration request failed:", error);
    formError.textContent =
      "Unable to contact the validation server. Check your connection and try again.";
    formError.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.removeAttribute("aria-busy");
  }
});

form.addEventListener("input", () => {
  formError.hidden = true;
  successMessage.hidden = true;
});
