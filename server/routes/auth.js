import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../services/prismaClient.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/demo
router.post('/demo', async (req, res) => {
  try {
    let user;
    const demoEmail = 'interviewer@pitchos.demo';
    try {
      user = await prisma.user.findUnique({ where: { email: demoEmail } });
      if (!user) {
        const passwordHash = await bcrypt.hash('demo1234', 10);
        user = await prisma.user.create({ data: { email: demoEmail, passwordHash } });
      }
    } catch (dbErr) {
      console.warn('DB unavailable for demo user, using fallback demo session:', dbErr.message);
      user = { id: 'demo-interviewer-id', email: demoEmail };
    }

    const secret = process.env.JWT_SECRET || 'pitchos-default-jwt-secret';
    const token = jwt.sign(
      { userId: user.id, email: user.email, isDemo: true },
      secret,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, isDemo: true } });
  } catch (err) {
    console.error('Demo login error:', err);
    res.status(500).json({ error: 'Failed to generate demo session' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const secret = process.env.JWT_SECRET || 'pitchos-default-jwt-secret';
    const decoded = jwt.verify(token, secret);

    if (decoded.isDemo) {
      return res.json({ user: { id: decoded.userId, email: decoded.email, isDemo: true } });
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true, createdAt: true } });
      if (user) return res.json({ user });
    } catch (dbErr) {
      console.warn('DB lookup failed in /me, returning decoded user session:', dbErr.message);
    }

    res.json({ user: { id: decoded.userId, email: decoded.email } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
