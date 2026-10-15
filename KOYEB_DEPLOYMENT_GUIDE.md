# Koyeb Deployment Guide for Klarone

This monorepo contains two services that should be deployed on Koyeb:
1. **API Service** (`apps/api` - NestJS backend + Prisma ORM)
2. **Web Service** (`apps/web` - Next.js storefront + staff admin)

---

## Architecture Overview

```
                      ┌──────────────────────┐
                      │    Koyeb Service:    │
                      │      klarone-web     │
                      │  (Next.js Front-end) │
                      └──────────┬───────────┘
                                 │
                   NEXT_PUBLIC_API_BASE_URL
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │    Koyeb Service:    │
                      │     klarone-api      │
                      │   (NestJS Backend)   │
                      └──────────┬───────────┘
                                 │
                            DATABASE_URL
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │  Supabase PostgreSQL │
                      │      (Database)      │
                      └──────────────────────┘
```

---

## Step 1: Deploy `klarone-api` (Backend First)

1. Log into your [Koyeb Dashboard](https://app.koyeb.com/).
2. Click **Create Service** → **GitHub**.
3. Select your repository: `Klarone2`.
4. In the configuration:
   - **Service Name**: `klarone-api`
   - **Deployment method**: Select **Dockerfile**
   - **Dockerfile location**: `Dockerfile.api`
   - **Exposed port**: `3000` (Protocol: HTTP, Path: `/`)
5. In the **Environment Variables** section, copy the values from `.env.production`:
   - `DATABASE_URL`: `postgresql://postgres.tmlfwhuzasjexwjbtagd:Nhs16@24082408@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true`
   - `DIRECT_URL`: `postgresql://postgres.tmlfwhuzasjexwjbtagd:Nhs16@24082408@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `STAFF_AUTH_JWT_SECRET`: *(Your secure string)*
   - `CUSTOMER_AUTH_JWT_SECRET`: *(Your secure string)*
   - `BETTER_AUTH_SECRET`: `klarone-better-auth-secret-super-secure-key-24082408`
   - `BETTER_AUTH_URL`: `https://<YOUR-KOYEB-API-DOMAIN>.koyeb.app`
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
6. Click **Deploy**.
7. Once deployed, note down the generated URL (e.g. `https://klarone-api-xxx.koyeb.app`).

---

## Step 2: Deploy `klarone-web` (Frontend Second)

1. Click **Create Service** → **GitHub**.
2. Select the repository: `Klarone2`.
3. In the configuration:
   - **Service Name**: `klarone-web`
   - **Deployment method**: Select **Dockerfile**
   - **Dockerfile location**: `Dockerfile.web`
   - **Exposed port**: `3000` (Protocol: HTTP, Path: `/`)
4. In the **Environment Variables / Build Arguments** section:
   - `NEXT_PUBLIC_API_BASE_URL`: `https://<YOUR-KOYEB-API-DOMAIN>.koyeb.app` (The URL from Step 1)
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
5. Click **Deploy**.
6. Once deployed, note down your web app's URL (e.g. `https://klarone-web-xxx.koyeb.app`).

---

## Step 3: Connect CORS on the API

1. Go back to your `klarone-api` service on Koyeb.
2. Edit Environment Variables and add:
   - `WEB_ORIGINS`: `https://<YOUR-KOYEB-WEB-DOMAIN>.koyeb.app,https://yourcustomdomain.com`
3. Save & Redeploy.

---

## Step 4 (Optional): Custom Domain

On Koyeb:
- Go to `klarone-web` → **Settings** → **Domains** → Add your custom domain (e.g. `klarone.in` or `www.klarone.in`).
- Add the CNAME / A records provided by Koyeb in your DNS registrar (GoDaddy, Cloudflare, Namecheap, etc.).
