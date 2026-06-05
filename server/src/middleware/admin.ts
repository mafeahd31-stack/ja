import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.userType !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}
