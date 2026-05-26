import type { Request, Response, NextFunction } from 'express';
import { getUserStore } from '../store/userStore';

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  iat: number;
  exp: number;
}

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo';

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
  const response = await fetch(`${GOOGLE_CERTS_URL}?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw new Error('Invalid Google ID token');
  }
  const payload = (await response.json()) as GoogleTokenPayload;

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (clientId && payload.aud !== clientId) {
    throw new Error('Token audience mismatch');
  }

  if (!payload.email || !payload.email_verified) {
    throw new Error('Email not verified');
  }

  return payload;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    email: string;
    name?: string;
    role: 'user' | 'admin';
  };
}

/**
 * Middleware: verify Google ID token from Authorization header and check allowed users.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization header with Bearer token is required' });
    return;
  }

  const idToken = authHeader.slice(7);

  verifyGoogleToken(idToken)
    .then(async (payload) => {
      const userStore = getUserStore();
      const user = await userStore.get(payload.email);

      if (!user) {
        res.status(403).json({
          error: 'Access denied',
          message: `${payload.email} is not in the allowed users list. Contact an admin.`,
        });
        return;
      }

      req.user = {
        email: user.email,
        name: payload.name ?? user.name,
        role: user.role,
      };

      next();
    })
    .catch((err) => {
      console.error('Auth error:', err);
      res.status(401).json({ error: 'Invalid or expired token' });
    });
}

/**
 * Middleware: require admin role after requireAuth.
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
