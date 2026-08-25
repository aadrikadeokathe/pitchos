# 🚀 PitchOS Deployment Guide (Resume Live Demo)

Follow this step-by-step guide to get your **PitchOS** live on **Vercel** (Frontend) and **Render** (Backend + Database) for free. Once complete, you will have a live URL to add to your resume!

---

## 📌 Prerequisites Checklist
- GitHub Account (Repository: `https://github.com/aadrikadeokathe/pitchos`)
- [Vercel Account](https://vercel.com) (Sign in with GitHub)
- [Render Account](https://render.com) (Sign in with GitHub)
- [Aiven Account](https://aiven.io) or [TiDB Cloud](https://tidbcloud.com) / [Railway](https://railway.app) (Free Cloud MySQL Database)
- Google Gemini API Key from [Google AI Studio](https://aistudio.google.com)

---

## 🛠️ Step 1: Deploy Database (Cloud MySQL)

PitchOS uses MySQL via Prisma. You can host a free cloud MySQL instance on **Aiven** or **TiDB Cloud**:

1. Go to **[Aiven.io](https://aiven.io)** (or TiDB Cloud / Railway).
2. Create a free **MySQL** database service.
3. Copy the **MySQL Service URI / Connection String**, e.g.:
   `mysql://user:password@host:port/pitchos?ssl-mode=REQUIRED`
4. From your local terminal in the project directory, push your schema to the cloud database:
   ```bash
   DATABASE_URL="your-cloud-mysql-connection-string" npx prisma db push --schema=server/prisma/schema.prisma
   ```

---

## ⚙️ Step 2: Deploy Backend API (Render)

1. Go to **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** → **Blueprint** (or **Web Service**).
3. Connect your GitHub repository: `aadrikadeokathe/pitchos`.
4. Render will automatically detect `render.yaml`.
5. Set the required environment variables:
   - `DATABASE_URL`: Your Cloud MySQL Connection String from Step 1
   - `GEMINI_API_KEY`: Your Gemini API key
   - `JWT_SECRET`: A long random string (e.g. `pitchos-production-secret-9988`)
   - `CLIENT_URL`: `*` (or your Vercel URL once deployed)
6. Click **Deploy**. Render will build and deploy your API.
7. Note down your Render Backend URL (e.g., `https://pitchos-api.onrender.com`).

Verify your backend is live by opening:
`https://pitchos-api.onrender.com/api/health` → Should return `{"status":"ok", ...}`

---

## 🌐 Step 3: Deploy Frontend (Vercel)

1. Go to **[Vercel Dashboard](https://vercel.com/new)**.
2. Import your GitHub repository `aadrikadeokathe/pitchos`.
3. Configure the Project:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (or `./`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variable**:
   - `VITE_API_URL` = `https://pitchos-api.onrender.com/api` *(replace with your actual Render URL)*
5. Click **Deploy**.
6. Vercel will give you your live URL (e.g., `https://pitchos.vercel.app` or `https://pitchos-aadrikadeokathe.vercel.app`).

---

## 📄 Step 4: Resume Ready!

Add these links to your resume under Projects:

**PitchOS — AI-Powered Pitch Deck Analyzer & VC Coaching Platform**
- **Live Demo**: `https://pitchos2.vercel.app/`
- **GitHub**: `https://github.com/aadrikadeokathe/pitchos`
- **Tech Stack**: React, Vite, Node.js, Express, Prisma, MySQL, Google Gemini AI, Vercel, Render.
