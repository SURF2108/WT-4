# Node.js Server-Side Validation Demo

A small registration-form demo with a browser frontend and a Node.js serverless API. The API validates submitted data on the server and does not create accounts or store submissions. Do not enter real passwords.

## Run locally

Requires Node.js 18 or newer.

```sh
npm start
```

Open [http://localhost:3000](http://localhost:3000). The form sends JSON to `POST /api/register`; the local Node server and Vercel function use the same validation module.

Validation rules:

- Name: 2–50 characters
- Email: valid email-shaped address
- Password: at least 8 characters with an uppercase letter, lowercase letter, and number
- Password confirmation: must match
- Age: whole number from 18 to 120

Invalid submissions return HTTP 400 with field-specific messages. Successful submissions return a confirmation.

## Deploy with Vercel

### Connect a GitHub repository

1. Push this project to a GitHub repository. If this folder is not already connected to that repository, create an empty repository on GitHub, then run:

   ```sh
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git add .
   git commit -m "Prepare validation demo for Vercel"
   git push -u origin main
   ```

2. Sign in to [Vercel](https://vercel.com/), choose **Add New → Project**, and import the GitHub repository.
3. Keep the detected defaults and click **Deploy**. Vercel serves `index.html` and the other root assets, and deploys `api/register.js` as the `POST /api/register` serverless function.
4. Each push to the connected branch triggers a new deployment. Open the Vercel project to find its production URL and deployment logs.

No GitHub Pages workflow is included: Pages cannot run the serverless function and would not provide genuine server-side validation.

### Deploy with the Vercel CLI

Alternatively, install and authenticate with the Vercel CLI, then run from the project directory:

```sh
npx vercel
```

Follow the prompts to link or create a Vercel project. Use `npx vercel --prod` for a production deployment.
