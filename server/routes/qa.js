import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { generateQAQuestion, evaluateAnswer, COVERAGE_AREAS } from '../services/gemini.js';
import prisma from '../services/prismaClient.js';

const router = express.Router();

// GET /api/qa/:sessionId/state — get current QA state
router.get('/:sessionId/state', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        slides: { include: { analysis: true } },
        qaAreas: { orderBy: { areaId: 'asc' } },
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const covered = session.qaAreas.filter((a) => a.status === 'COVERED').length;
    const total = session.qaAreas.length;
    const pending = session.qaAreas.filter((a) => a.status === 'PENDING' || a.status === 'IN_PROGRESS');
    const currentArea = pending[0] || null;

    res.json({
      sessionId,
      status: session.status,
      qaAreas: session.qaAreas.map((a) => ({
        ...a,
        areaName: COVERAGE_AREAS[a.areaId]?.name || a.areaId,
      })),
      covered,
      total,
      isComplete: covered === total,
      currentAreaId: currentArea?.areaId || null,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch QA state' });
  }
});

// GET /api/qa/:sessionId/messages — get all messages for session
router.get('/:sessionId/messages', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const messages = await prisma.qAMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/qa/:sessionId/start — AI asks the first question for current area
router.post('/:sessionId/start', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: {
        slides: { include: { analysis: true } },
        qaAreas: true,
      },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Find next pending area
    const nextArea = session.qaAreas.find((a) => a.status === 'PENDING');
    if (!nextArea) return res.json({ complete: true, message: 'All areas covered!' });

    // Mark as IN_PROGRESS
    await prisma.qAArea.update({
      where: { id: nextArea.id },
      data: { status: 'IN_PROGRESS' },
    });

    // Update session status
    if (session.status === 'QA_PENDING') {
      await prisma.session.update({ where: { id: sessionId }, data: { status: 'QA_IN_PROGRESS' } });
    }

    const history = await prisma.qAMessage.findMany({
      where: { sessionId, areaId: nextArea.areaId },
      orderBy: { createdAt: 'asc' },
    });

    const question = await generateQAQuestion(session, nextArea, history);

    // Save AI message
    const savedMsg = await prisma.qAMessage.create({
      data: {
        sessionId,
        areaId: nextArea.areaId,
        role: 'ai',
        content: question,
      },
    });

    await prisma.qAArea.update({
      where: { id: nextArea.id },
      data: { questionsAsked: { increment: 1 } },
    });

    res.json({
      areaId: nextArea.areaId,
      areaName: COVERAGE_AREAS[nextArea.areaId]?.name,
      message: savedMsg,
      complete: false,
    });
  } catch (err) {
    console.error('QA start error:', err);
    res.status(500).json({ error: err.message || 'Failed to start QA' });
  }
});

// POST /api/qa/:sessionId/answer — founder submits an answer, AI evaluates
router.post('/:sessionId/answer', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { areaId, answer, lastQuestion } = req.body;

    if (!areaId || !answer) return res.status(400).json({ error: 'areaId and answer required' });

    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId: req.user.id },
      include: { slides: { include: { analysis: true } }, qaAreas: true },
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const area = session.qaAreas.find((a) => a.areaId === areaId);
    if (!area) return res.status(404).json({ error: 'Area not found' });

    // Save founder's answer
    await prisma.qAMessage.create({
      data: { sessionId, areaId, role: 'user', content: answer },
    });

    // Evaluate the answer
    const history = await prisma.qAMessage.findMany({
      where: { sessionId, areaId },
      orderBy: { createdAt: 'asc' },
    });

    const evaluation = await evaluateAnswer(area, lastQuestion, answer, history);

    if (evaluation.verdict === 'COVERED') {
      // Mark area as covered
      await prisma.qAArea.update({
        where: { id: area.id },
        data: { status: 'COVERED', finalVerdict: 'COVERED' },
      });

      // Save AI feedback
      const feedbackMsg = await prisma.qAMessage.create({
        data: {
          sessionId,
          areaId,
          role: 'ai',
          content: evaluation.feedback,
          aiVerdict: 'COVERED',
        },
      });

      // Check if ALL areas are now covered
      const updatedAreas = await prisma.qAArea.findMany({ where: { sessionId } });
      const allCovered = updatedAreas.every((a) => a.status === 'COVERED');

      if (allCovered) {
        await prisma.session.update({ where: { id: sessionId }, data: { status: 'COMPLETE' } });
        return res.json({
          verdict: 'COVERED',
          feedback: evaluation.feedback,
          message: feedbackMsg,
          areaComplete: true,
          sessionComplete: true,
        });
      }

      // Move to next area
      const nextArea = updatedAreas.find((a) => a.status === 'PENDING');
      let nextQuestion = null;
      if (nextArea) {
        await prisma.qAArea.update({ where: { id: nextArea.id }, data: { status: 'IN_PROGRESS' } });
        const nextHistory = [];
        nextQuestion = await generateQAQuestion(session, nextArea, nextHistory);
        await prisma.qAMessage.create({
          data: { sessionId, areaId: nextArea.areaId, role: 'ai', content: nextQuestion },
        });
        await prisma.qAArea.update({
          where: { id: nextArea.id },
          data: { questionsAsked: { increment: 1 } },
        });
      }

      return res.json({
        verdict: 'COVERED',
        feedback: evaluation.feedback,
        message: feedbackMsg,
        areaComplete: true,
        sessionComplete: false,
        nextArea: nextArea ? { areaId: nextArea.areaId, areaName: COVERAGE_AREAS[nextArea.areaId]?.name } : null,
        nextQuestion,
      });
    } else {
      // PARTIAL or INSUFFICIENT — push back
      const pushback = evaluation.pushback || evaluation.feedback;
      const aiMsg = await prisma.qAMessage.create({
        data: {
          sessionId,
          areaId,
          role: 'ai',
          content: pushback,
          aiVerdict: evaluation.verdict,
        },
      });

      await prisma.qAArea.update({
        where: { id: area.id },
        data: { questionsAsked: { increment: 1 } },
      });

      return res.json({
        verdict: evaluation.verdict,
        feedback: evaluation.feedback,
        pushback,
        message: aiMsg,
        areaComplete: false,
        sessionComplete: false,
      });
    }
  } catch (err) {
    console.error('QA answer error:', err);
    res.status(500).json({ error: err.message || 'Failed to process answer' });
  }
});

export default router;
