# Daybook Budget Tracker

Daybook is a private, single-user budget tracker built with a Node.js server and Vercel serverless functions. It stores monthly budgets and transactions in MongoDB Atlas and validates all writes on the server.

Features:

- Monthly spending limit and remaining-budget progress
- Income and expense entries with dates and categories
- Monthly income, spending, and category summaries
- Review and delete recent transactions
- Server-side validation, private sign-in, and HTTP-only session cookies

Amounts are displayed in Indian rupees (INR). This is a personal demo, not financial advice or a production accounting system. Use a unique app password and do not reuse an important password.

## Configure MongoDB Atlas

This Vercel project currently has no MongoDB Atlas integration provisioned. Connect an existing Atlas cluster:

1. In Atlas, create a database user with access limited to the `budget_tracker` database and ensure the cluster's network access permits the Vercel Function's outbound connection. Avoid broad network access rules for sensitive data.
2. Copy the cluster connection URI and replace its database user, password, and host parts.
3. For local development, copy `.env.example` to `.env` and set `MONGODB_URI`, `MONGODB_DB_NAME`, `APP_PASSWORD`, and `SESSION_SECRET`. Use an app password of at least 16 characters and a session secret with at least 32 bytes. Keep `.env` private; it is ignored by Git.
4. In Vercel, open the `wt-4` project’s **Settings → Environment Variables** and add the same variables for the **Preview** environment. Add them to Production only if you later choose to deploy the app to production.
5. Redeploy after setting or changing environment variables. The first database request creates the collections' supporting indexes.

Generate a session secret locally with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Never paste database credentials into source code, GitHub, or chat. The app uses one shared app password and one private data set; it does not support separate users or accounts.

## Run locally

Requires Node.js 20.19 or newer.

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) and sign in with `APP_PASSWORD`.

Run the unit tests with:

```sh
npm test
```

## Vercel deployment

The app is configured for the Vercel **Other** framework preset. Static files are served from `public/`; `api/auth.js`, `api/budget.js`, and `api/transactions.js` run as serverless functions. Local development uses the same API handlers.

The existing Vercel preview is protected by Vercel Deployment Protection. Keep that protection enabled. The app-level password also gates all budget APIs. The configured Vercel project is `wt-4`; deployments from this checkout create previews:

```sh
vercel
```

Once MongoDB and app security environment variables are set for Preview, the deployed preview can connect to Atlas. The app does not store passwords or transaction details in browser storage.

## API

- `GET /api/auth` — report setup and session status
- `POST /api/auth` — sign in or sign out
- `GET /api/transactions?month=YYYY-MM` — monthly transactions and summary
- `POST /api/transactions` — validate and save an income or expense
- `DELETE /api/transactions?id=...` — remove a transaction
- `GET /api/budget?month=YYYY-MM` — read a monthly spending limit
- `PUT /api/budget` — validate and save a monthly spending limit
