import jwt from 'jsonwebtoken';
import prisma from '../services/prismaClient.js';

export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const secret = process.env.JWT_SECRET || 'pitchos-default-jwt-secret';
    const decoded = jwt.verify(token, secret);

    if (decoded.isDemo) {
      req.user = { id: decoded.userId, email: decoded.email };
      return next();
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
      if (user) {
        req.user = user;
        return next();
      }
    } catch (dbErr) {
      console.warn('DB lookup failed, falling back to token claims:', dbErr.message);
    }

    req.user = { id: decoded.userId, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
