# PitchOS

> AI-powered pitch deck analyzer and VC mock Q&A coach.

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL running locally
- Gemini API key ([get one here](https://aistudio.google.com))

### 1. Server setup
```bash
cd server
cp .env .env.local   # Already created — edit DATABASE_URL and GEMINI_API_KEY
npm install
npx prisma db push   # Creates all tables
npm run dev          # Starts on http://localhost:3001
```

### 2. Client setup
```bash
cd client
npm install
npm run dev          # Starts on http://localhost:5173
```

### .env values to fill in
```
server/.env:
  DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/pitchos
  JWT_SECRET=any-long-random-string
  GEMINI_API_KEY=your-key-from-aistudio.google.com

client/.env:
  VITE_API_URL=http://localhost:3001/api  ← already set
```

## Architecture

```
Upload PDF → Gemini Slide Segmentation → Slide-by-Slide Analysis → QA Grilling (9 areas) → Improvement Report
```

## Stack
- **Frontend**: React + Vite
- **Styling**: Vanilla CSS (custom design system)
- **Backend**: Node.js + Express (ESM)
- **Database**: MySQL via Prisma ORM
- **AI**: Gemini 1.5 Pro
- **Auth**: JWT + bcrypt
