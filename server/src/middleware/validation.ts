import { Request, Response, NextFunction } from 'express';
import { validate as isUUID } from 'uuid';

/**
 * Validate request body against a schema function
 */
export function validateBody(schema: (body: Record<string, unknown>) => string | null) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const error = schema(req.body);
    if (error) {
      res.status(400).json({ error });
      return;
    }
    next();
  };
}

/**
 * Sanitize string inputs - trim and escape HTML
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Check for common injection patterns
 */
export function hasInjection(input: string): boolean {
  const patterns = [
    /\bDROP\s+TABLE\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bALTER\s+TABLE\b/i,
    /\bEXEC\b/i,
    /\bUNION\s+SELECT\b/i,
    /\bxp_cmdshell\b/i,
    /<\s*script\b/i,
    /onerror\s*=/i,
    /onload\s*=/i,
  ];
  return patterns.some((p) => p.test(input));
}

/**
 * Sanitize all string fields in request body
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }
  next();
}
