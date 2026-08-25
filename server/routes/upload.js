import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { authenticate } from '../middleware/auth.js';
import { segmentSlides } from '../services/gemini.js';
import prisma from '../services/prismaClient.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDFs allowed'));
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// POST /api/upload
// 1. Save PDF
// 2. Extract full text via pdf-parse
// 3. Send to Gemini for slide segmentation
// 4. Store session + slides in DB
router.post('/', authenticate, upload.single('deck'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const deckName = req.body.deckName || req.file.originalname.replace('.pdf', '');

    // Parse PDF text
    const pdfBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length < 50) {
      return res.status(400).json({ error: 'Could not extract text from PDF. Make sure the PDF is not image-only.' });
    }

    // Gemini slide segmentation
    const segments = await segmentSlides(fullText);

    // Create session in DB
    const session = await prisma.session.create({
      data: {
        userId: req.user.id,
        deckName,
        status: 'ANALYZING',
        slides: {
          create: segments.map((s) => ({
            index: s.index,
            title: s.title,
            rawText: s.rawText,
          })),
        },
      },
      include: { slides: true },
    });

    res.json({
      sessionId: session.id,
      deckName: session.deckName,
      slideCount: session.slides.length,
      slides: session.slides.map((s) => ({ id: s.id, index: s.index, title: s.title })),
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// POST /api/upload/sample — Instant sample pitch deck for interviewers & testing
router.post('/sample', authenticate, async (req, res) => {
  try {
    const deckName = 'Apex Pay — Series A Pitch Deck';
    const sampleSlides = [
      { index: 1, title: 'Title & Vision', rawText: 'Apex Pay: Cross-border instant payments for B2B global commerce. Next-generation settlement infrastructure.' },
      { index: 2, title: 'The Problem', rawText: 'B2B cross-border transactions take 3-5 business days and incur 4.5% in FX fees. Mid-market exporters lose $42B annually to hidden settlement delays.' },
      { index: 3, title: 'The Solution', rawText: 'Real-time settlement engine using stablecoin liquidity pools & automated compliance routing. 2-second settlement, 0.4% flat fee.' },
      { index: 4, title: 'Market Opportunity', rawText: 'Global B2B cross-border payment volume is $156 Trillion. Our SAM is LatAm & SE Asia exporters ($3.2 Trillion TAM).' },
      { index: 5, title: 'Traction & Growth', rawText: '$1.2M ARR, 45% MoM volume growth. $18M processed in Q2 2026 across 120 active enterprise clients.' },
      { index: 6, title: 'Business Model', rawText: '0.4% take rate per transaction volume + $499/mo SaaS platform fee for automated ERP integration.' },
      { index: 7, title: 'Competitive Advantage', rawText: 'Proprietary instant FX clearing license in 4 corridors. Direct integration with SAP, NetSuite, and QuickBooks.' },
      { index: 8, title: 'Team & The Ask', rawText: 'Ex-Stripe & PayPal engineering leads. Raising $5M Series A to expand regulatory licenses in LATAM & scale sales team.' }
    ];

    let session;
    try {
      session = await prisma.session.create({
        data: {
          userId: req.user.id,
          deckName,
          status: 'ANALYZING',
          slides: {
            create: sampleSlides.map((s) => ({
              index: s.index,
              title: s.title,
              rawText: s.rawText,
            })),
          },
        },
        include: { slides: true },
      });
    } catch (dbErr) {
      console.warn('DB error on sample deck upload, creating fallback session:', dbErr.message);
      session = {
        id: `sample-session-${Date.now()}`,
        deckName,
        slides: sampleSlides.map((s, idx) => ({ id: `slide-${idx + 1}`, ...s })),
      };
    }

    res.json({
      sessionId: session.id,
      deckName: session.deckName,
      slideCount: session.slides.length,
      slides: session.slides.map((s) => ({ id: s.id, index: s.index, title: s.title })),
    });
  } catch (err) {
    console.error('Sample creation error:', err);
    res.status(500).json({ error: err.message || 'Sample deck creation failed' });
  }
});

export default router;
