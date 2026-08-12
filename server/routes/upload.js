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

export default router;
