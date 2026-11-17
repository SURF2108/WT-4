"use strict";

const loginScreen = document.querySelector("#login-screen");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const setupHelp = document.querySelector("#setup-help");
const dashboard = document.querySelector("#dashboard");
const signOutButton = document.querySelector("#sign-out");
const appNotice = document.querySelector("#app-notice");
const monthPicker = document.querySelector("#month-picker");
const budgetForm = document.querySelector("#budget-form");
const transactionForm = document.querySelector("#transaction-form");
const transactionList = document.querySelector("#transaction-list");
const categorySelect = document.querySelector("#category");
const typeInput = document.querySelector("#transaction-type");
const addButton = document.querySelector("#add-transaction");

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const categoryIcons = {
  Housing: "⌂",
  Food: "◒",
  Transport: "↗",
  Utilities: "ϟ",
  Health: "✚",
  Entertainment: "♫",
  Shopping: "◇",
  Education: "▤",
  Personal: "✳",
  Other: "·",
  Salary: "↙",
  Freelance: "✳",
  Investment: "⌁",
  Gift: "♡",
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatMoney(cents) {
  return currency.format((cents || 0) / 100);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an unexpected response. Please try again.");
  }
  if (!response.ok) {
    const error = new Error(result.message || "The request could not be completed.");
    error.status = response.status;
    error.fieldErrors = result.errors || {};
    throw error;
  }
  return result;
}

function setFormErrors(form, errors) {
  for (const field of form.elements) {
    if (!field.name) {
      continue;
    }
    const message = errors[field.name] || "";
    const errorElement = document.querySelector(`#${field.name}-error`);
    field.toggleAttribute("aria-invalid", Boolean(message));
    if (message && errorElement) {
      field.setAttribute("aria-describedby", errorElement.id);
    } else {
      field.removeAttribute("aria-describedby");
    }
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.hidden = !message;
    }
  }
}

function displayLogin(message = "") {
  dashboard.hidden = true;
  loginScreen.hidden = false;
  signOutButton.hidden = true;
  loginError.textContent = message;
  loginError.hidden = !message;
  document.querySelector("#app-password").focus();
}

function displayDashboard() {
  loginScreen.hidden = true;
  dashboard.hidden = false;
  signOutButton.hidden = false;
}

function setNotice(message, kind = "success") {
  appNotice.textContent = message;
  appNotice.className = `notice ${kind}`;
  appNotice.hidden = !message;
}

function selectedMonth() {
  return monthPicker.value || currentMonth();
}

function updateBudgetProgress(budgetCents, expenseCents) {
  const remaining = budgetCents - expenseCents;
  const percentage = budgetCents > 0
    ? Math.round((expenseCents / budgetCents) * 100)
    : 0;
  const progress = document.querySelector("#budget-progress");
  document.querySelector("#remaining-value").textContent = formatMoney(remaining);
  document.querySelector("#remaining-value").classList.toggle("over-budget", remaining < 0);
  document.querySelector("#remaining-caption").textContent =
    budgetCents > 0
      ? remaining < 0
        ? `${formatMoney(Math.abs(remaining))} over your spending limit`
        : "available from your monthly limit"
      : "Set a monthly budget to get started";
  progress.style.width = `${Math.min(percentage, 100)}%`;
  progress.classList.toggle("progress-over", percentage >= 100);
  document.querySelector("#progress-caption").textContent =
    budgetCents > 0 ? `${percentage}% of budget used` : "No spending limit set";
  document.querySelector("#income-caption").textContent =
    `${window.budgetData?.incomeCount || 0} ${window.budgetData?.incomeCount === 1 ? "entry" : "entries"} this month`;
  document.querySelector("#spent-caption").textContent =
    `${window.budgetData?.expenseCount || 0} ${window.budgetData?.expenseCount === 1 ? "entry" : "entries"} this month`;
}

function renderCategories(categories, expenseCents) {
  const breakdown = document.querySelector("#category-breakdown");
  const empty = document.querySelector("#empty-categories");
  breakdown.replaceChildren();
  empty.hidden = categories.length > 0;

  for (const item of categories) {
    const row = document.createElement("div");
    row.className = "category-row";
    const heading = document.createElement("div");
    heading.className = "category-heading";
    const name = document.createElement("span");
    name.className = "category-name";
    const icon = document.createElement("span");
    icon.className = "category-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = categoryIcons[item.category] || "·";
    const label = document.createElement("span");
    label.textContent = item.category;
    name.append(icon, label);
    const amount = document.createElement("span");
    amount.className = "category-amount";
    amount.textContent = formatMoney(item.amountCents);
    heading.append(name, amount);
    const track = document.createElement("div");
    track.className = "category-track";
    const fill = document.createElement("span");
    fill.style.width = `${expenseCents > 0 ? Math.min((item.amountCents / expenseCents) * 100, 100) : 0}%`;
    track.append(fill);
    row.append(heading, track);
    breakdown.append(row);
  }
}

function renderTransactions(transactions) {
  transactionList.replaceChildren();
  document.querySelector("#transaction-count").textContent = String(transactions.length);
  document.querySelector("#empty-state").hidden = transactions.length > 0;
  document.querySelector("#list-limit").hidden = transactions.length < 250;

  for (const transaction of transactions) {
    const row = document.createElement("article");
    row.className = "transaction-row";
    const icon = document.createElement("span");
    icon.className = `transaction-icon ${transaction.type}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = categoryIcons[transaction.category] || "·";
    const detail = document.createElement("div");
    detail.className = "transaction-detail";
    const description = document.createElement("strong");
    description.textContent = transaction.description;
    const meta = document.createElement("span");
    const date = new Date(`${transaction.date}T00:00:00`);
    meta.textContent = `${transaction.category} · ${date.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
    detail.append(description, meta);
    const amount = document.createElement("strong");
    amount.className = `transaction-amount ${transaction.type}`;
    amount.textContent = `${transaction.type === "income" ? "+" : "−"}${formatMoney(transaction.amountCents)}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete-transaction";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Delete ${transaction.description}`);
    remove.addEventListener("click", () => deleteTransaction(transaction.id));
    row.append(icon, detail, amount, remove);
    transactionList.append(row);
  }
}

function updateCategoryOptions(type, categories) {
  const available = categories[type];
  categorySelect.replaceChildren(
    ...available.map((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      return option;
    }),
  );
  addButton.innerHTML = `${type === "income" ? "Add income" : "Add expense"} <span aria-hidden="true">＋</span>`;
}

async function loadDashboard() {
  setNotice("");
  try {
    const month = selectedMonth();
    const [transactionsResult, budgetResult] = await Promise.all([
      requestJson(`/api/transactions?month=${encodeURIComponent(month)}`),
      requestJson(`/api/budget?month=${encodeURIComponent(month)}`),
    ]);
    const { summary, transactions, categoryOptions } = transactionsResult;
    window.budgetData = summary;
    document.querySelector("#income-value").textContent = formatMoney(summary.incomeCents);
    document.querySelector("#spent-value").textContent = formatMoney(summary.expenseCents);
    document.querySelector("#budget-amount").value =
      (budgetResult.amountCents / 100).toFixed(2);
    updateBudgetProgress(budgetResult.amountCents, summary.expenseCents);
    renderTransactions(transactions);
    renderCategories(summary.categories, summary.expenseCents);
    updateCategoryOptions(typeInput.value, categoryOptions);
  } catch (error) {
    if (error.status === 401) {
      displayLogin("Your session expired. Sign in again to continue.");
      return;
    }
    setNotice(error.message, "failure");
  }
}

async function deleteTransaction(id) {
  const confirmed = window.confirm("Remove this transaction from your budget?");
  if (!confirmed) {
    return;
  }
  try {
    const result = await requestJson(`/api/transactions?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setNotice(result.message);
    await loadDashboard();
  } catch (error) {
    setNotice(error.message, "failure");
  }
}

async function initialize() {
  monthPicker.value = currentMonth();
  document.querySelector("#date").value = today();
  try {
    const auth = await requestJson("/api/auth");
    setupHelp.hidden = auth.configured;
    loginForm.querySelector("button[type=submit]").disabled = !auth.configured;
    if (!auth.configured) {
      loginScreen.hidden = false;
      signOutButton.hidden = true;
      loginError.textContent =
        "The tracker needs its database and security settings before it can be used.";
      loginError.hidden = false;
      return;
    }
    if (auth.authenticated) {
      displayDashboard();
      await loadDashboard();
    } else {
      displayLogin();
    }
  } catch (error) {
    displayLogin(error.message);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  try {
    await requestJson("/api/auth", {
      method: "POST",
      body: JSON.stringify({
        action: "login",
        password: new FormData(loginForm).get("password"),
      }),
    });
    loginForm.reset();
    displayDashboard();
    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  } finally {
    button.disabled = !setupHelp.hidden;
  }
});

signOutButton.addEventListener("click", async () => {
  try {
    await requestJson("/api/auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" }),
    });
    displayLogin("You have been signed out.");
  } catch (error) {
    setNotice(error.message, "failure");
  }
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".segment").forEach((segment) => {
      const selected = segment === button;
      segment.classList.toggle("selected", selected);
      segment.setAttribute("aria-pressed", String(selected));
    });
    typeInput.value = button.dataset.type;
    updateCategoryOptions(typeInput.value, {
      expense: [
        "Housing", "Food", "Transport", "Utilities", "Health",
        "Entertainment", "Shopping", "Education", "Personal", "Other",
      ],
      income: ["Salary", "Freelance", "Investment", "Gift", "Other"],
    });
    addButton.lastChild.textContent = " ＋";
  });
});

transactionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormErrors(transactionForm, {});
  document.querySelector("#transaction-error").hidden = true;
  addButton.disabled = true;
  try {
    const data = Object.fromEntries(new FormData(transactionForm));
    const result = await requestJson("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
    transactionForm.reset();
    document.querySelector("#date").value = today();
    typeInput.value = "expense";
    document.querySelector('[data-type="expense"]').click();
    setNotice(result.message);
    await loadDashboard();
  } catch (error) {
    setFormErrors(transactionForm, error.fieldErrors || {});
    const transactionError = document.querySelector("#transaction-error");
    transactionError.textContent = error.message;
    transactionError.hidden = false;
    const firstInvalid = transactionForm.querySelector('[aria-invalid="true"]');
    if (firstInvalid) {
      firstInvalid.focus();
    }
  } finally {
    addButton.disabled = false;
  }
});

budgetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const budgetError = document.querySelector("#budget-error");
  budgetError.hidden = true;
  document.querySelector("#budget-amount").removeAttribute("aria-invalid");
  try {
    const result = await requestJson("/api/budget", {
      method: "PUT",
      body: JSON.stringify({
        month: selectedMonth(),
        amount: new FormData(budgetForm).get("amount"),
      }),
    });
    setNotice(result.message);
    await loadDashboard();
  } catch (error) {
    budgetError.textContent = error.fieldErrors?.amount || error.message;
    budgetError.hidden = false;
    document.querySelector("#budget-amount").setAttribute("aria-invalid", "true");
  }
});

monthPicker.addEventListener("change", () => {
  const month = selectedMonth();
  document.querySelector("#date").value =
    month === currentMonth() ? today() : `${month}-01`;
  loadDashboard();
});

initialize();
