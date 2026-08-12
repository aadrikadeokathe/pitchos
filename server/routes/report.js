import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generatePriorityActions, COVERAGE_AREAS } from '../services/gemini.js';
import prisma from '../services/prismaClient.js';

const router = express.Router();

// POST /api/report/:sessionId/generate — generate and store the report
router.post('/:sessionId/generate', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        slides: { include: { analysis: true }, orderBy: { index: 'asc' } },
        qaAreas: true,
        qaMessages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Check if report already exists
    const existing = await prisma.report.findUnique({ where: { sessionId } });
    if (existing) return res.json({ report: existing });

    const priorityActions = await generatePriorityActions(session);

    const report = await prisma.report.create({
      data: { sessionId, priorityActions },
    });

    res.json({ report, session });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate report' });
  }
});

// GET /api/report/:sessionId — get existing report with full session data
router.get('/:sessionId', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        slides: { include: { analysis: true }, orderBy: { index: 'asc' } },
        qaAreas: true,
        qaMessages: { orderBy: { createdAt: 'asc' } },
        report: true,
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Enrich QA areas with names
    const enrichedAreas = session.qaAreas.map((a) => ({
      ...a,
      areaName: COVERAGE_AREAS[a.areaId]?.name || a.areaId,
    }));

    res.json({ ...session, qaAreas: enrichedAreas });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// GET /api/report/sessions/all — get all sessions for dashboard
router.get('/sessions/all', authenticate, async (req, res) => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        report: true,
        _count: { select: { slides: true } },
      },
    });
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

export default router;
