# Render Deployment Guide for Klarone

Render connects directly to your GitHub repository and automatically deploys your project whenever you push changes.

You have two services to deploy on Render:
1. **`klarone-api`** (Backend NestJS API + Prisma Client)
2. **`klarone-web`** (Frontend Next.js Storefront & Staff Portal)

---

## Method A: 1-Click Render Blueprint (Recommended)

Because we added [`render.yaml`](./render.yaml), Render can automatically create both services for you:

1. Push your latest code to your GitHub repo:
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin redesign-v2
   ```
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository (`Naitik2408/klarone`).
5. Select the branch (e.g. `redesign-v2` or `main`).
6. Render will read `render.yaml` and prompt you to fill in the missing environment variables (copy them from [`.env.production`](./.env.production)):
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `NEXT_PUBLIC_API_BASE_URL` (Set this to your `klarone-api.onrender.com` URL)
   - `WEB_ORIGINS` (Set this to your `klarone-web.onrender.com` URL)
   - `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`
   - `CLOUDINARY_...` & `RAZORPAY_...`
7. Click **Apply**. Render will automatically build and launch both services!

---

## Method B: Manual Service Creation

If you prefer to configure each service manually in the Render UI:

### Service 1: `klarone-api` (Web Service)
- **Name**: `klarone-api`
- **Language**: `Node`
- **Branch**: `redesign-v2` (or your active branch)
- **Root Directory**: *(Leave empty — runs from repository root)*
- **Build Command**:
  ```bash
  pnpm install --frozen-lockfile && pnpm run build:api
  ```
- **Start Command**:
  ```bash
  pnpm run start:api
  ```
- **Environment Variables**:
  Add all variables from [`.env.production`](./.env.production):
  - `NODE_ENV`: `production`
  - `PORT`: `10000` (Render default)
  - `DATABASE_URL`: `postgresql://postgres.tmlfwhuzasjexwjbtagd:Nhs16@24082408@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true`
  - `DIRECT_URL`: `postgresql://postgres.tmlfwhuzasjexwjbtagd:Nhs16@24082408@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`
  - `STAFF_AUTH_JWT_SECRET`: `replace-with-a-very-long-random-secret-key-32-chars-min`
  - `CUSTOMER_AUTH_JWT_SECRET`: `replace-with-a-very-long-random-secret-key-32-chars-min`
  - `BETTER_AUTH_SECRET`: `klarone-better-auth-secret-super-secure-key-24082408`
  - `BETTER_AUTH_URL`: `https://klarone-api.onrender.com`
  - `RAZORPAY_KEY_ID`: `rzp_test_Tf6kixsUJXOGyg`
  - `RAZORPAY_KEY_SECRET`: `xWqxl5jkBGcgmXuWMaPWOYYm`
  - `OPENAI_API_KEY`: *(From .env.production)*
  - `GEMINI_API_KEY`: *(From .env.production)*
  - `GROQ_API_KEY`: *(From .env.production)*
  - `CLOUDINARY_CLOUD_NAME`: `dfjzdnuec`
  - `CLOUDINARY_API_KEY`: `437489839269232`
  - `CLOUDINARY_API_SECRET`: `R0eVlU7G486JAyqf_eD8obuMD7s`
  - `SMTP_USER`: `naitikkumar2408@gmail.com`
  - `SMTP_PASS`: `fkwfvqwmitnzrtzg`
  - `SMTP_HOST`: `smtp.gmail.com`
  - `SMTP_PORT`: `587`

---

### Service 2: `klarone-web` (Web Service)
- **Name**: `klarone-web`
- **Language**: `Node`
- **Branch**: `redesign-v2` (or your active branch)
- **Root Directory**: *(Leave empty — runs from repository root)*
- **Build Command**:
  ```bash
  pnpm install --frozen-lockfile && pnpm run build:web
  ```
- **Start Command**:
  ```bash
  pnpm run start:web -- -p 10000
  ```
- **Environment Variables**:
  - `NODE_ENV`: `production`
  - `PORT`: `10000`
  - `NEXT_PUBLIC_API_BASE_URL`: `https://klarone-api.onrender.com` (Your deployed API URL from Service 1)

---

### Final Step: Enable CORS on API
Once both services are running:
1. Go back to `klarone-api` in Render → **Environment**.
2. Set `WEB_ORIGINS` to `https://klarone-web.onrender.com` (and your custom domain if applicable).
3. Click **Save Changes** (Render will redeploy with CORS allowed).
