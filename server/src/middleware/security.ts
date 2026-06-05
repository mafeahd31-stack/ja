import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

/**
 * Check if requesting user is banned - prevent banned users from making requests
 */
export async function checkBanned(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  try {
    if (req.user.userType === 'user' || req.user.userType === 'admin') {
      const user = await User.findById(req.user.userId).select('isBanned banReason');

      if (user?.isBanned) {
        res.status(403).json({
          error: 'حسابك محظور',
          reason: user.banReason || '',
          code: 'ACCOUNT_BANNED',
        });
        return;
      }
    }
    next();
  } catch {
    next();
  }
}

/**
 * Security headers for API responses
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'geolocation=*, camera=(), microphone=()');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}
