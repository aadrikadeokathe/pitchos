import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { analyzeSlide, COVERAGE_AREAS } from '../services/gemini.js';
import prisma from '../services/prismaClient.js';

const router = express.Router();

// POST /api/analyze/:sessionId
// Analyzes all slides in a session and initializes QA areas
router.post('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: { slides: { orderBy: { index: 'asc' } } },
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status !== 'ANALYZING') return res.status(400).json({ error: 'Session already analyzed' });

    // Analyze slides sequentially (to avoid rate limits)
    const analyses = [];
    for (const slide of session.slides) {
      try {
        const analysis = await analyzeSlide(slide);
        const saved = await prisma.slideAnalysis.create({
          data: {
            slideId: slide.id,
            slideType: analysis.slideType,
            areaId: analysis.areaId,
            score: analysis.score,
            verdict: analysis.verdict,
            issues: analysis.issues,
            suggestions: analysis.suggestions,
          },
        });
        analyses.push({ slideId: slide.id, slideTitle: slide.title, ...analysis });
      } catch (err) {
        console.error(`Failed to analyze slide ${slide.index}:`, err.message);
        // Store a fallback analysis
        await prisma.slideAnalysis.create({
          data: {
            slideId: slide.id,
            slideType: 'Other',
            areaId: 'PROBLEM',
            score: 3,
            verdict: 'Solid',
            issues: ['Analysis failed — please review manually'],
            suggestions: ['Re-run analysis'],
          },
        });
      }
    }

    // Compute overall score
    const scores = analyses.map((a) => a.score).filter(Boolean);
    const overallScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Determine which areas need QA (score < 4) and which auto-pass (score >= 4)
    // Map area → lowest score from slides assigned to that area
    const areaScores = {};
    for (const a of analyses) {
      if (!areaScores[a.areaId] || a.score < areaScores[a.areaId]) {
        areaScores[a.areaId] = a.score;
      }
    }

    // All 9 areas get a QA entry; auto-cover strong ones
    const qaAreaData = Object.keys(COVERAGE_AREAS).map((areaId) => {
      const score = areaScores[areaId];
      const autoCovered = score !== undefined && score >= 4;
      return {
        sessionId,
        areaId,
        status: autoCovered ? 'COVERED' : 'PENDING',
        questionsAsked: 0,
      };
    });

    await prisma.qAArea.createMany({ data: qaAreaData });

    // Update session status
    await prisma.session.update({
      where: { id: sessionId },
      data: { overallScore, status: 'QA_PENDING' },
    });

    // Return full analysis results
    const fullSlides = await prisma.slide.findMany({
      where: { sessionId },
      include: { analysis: true },
      orderBy: { index: 'asc' },
    });

    const qaAreas = await prisma.qAArea.findMany({ where: { sessionId } });
    const pendingCount = qaAreas.filter((a) => a.status === 'PENDING').length;

    res.json({
      sessionId,
      overallScore: Math.round(overallScore * 10) / 10,
      slides: fullSlides,
      qaAreas,
      pendingAreasCount: pendingCount,
      message: `Analysis complete. ${pendingCount} areas need QA coverage.`,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

// GET /api/analyze/:sessionId — get existing analysis
router.get('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        slides: { include: { analysis: true }, orderBy: { index: 'asc' } },
        qaAreas: true,
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

export default router;
