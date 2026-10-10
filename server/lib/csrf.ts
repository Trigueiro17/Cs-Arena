import { config } from '../config';

/**
 * Validate origin for mutation requests to protect against Cross-Site Request Forgery (CSRF)
 */
export function validateCsrf(req: Request): boolean {
  // Safe HTTP methods don't modify state
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  // If no origin and no referer in browser request
  if (!origin && !referer) {
    // Non-browser API clients or direct server-to-server calls
    return true;
  }

  const targetUrl = origin || referer;
  if (!targetUrl) return true;

  try {
    const parsedTarget = new URL(targetUrl);
    
    // Check against host
    if (host) {
      const cleanHost = host.split(':')[0];
      const parsedHost = parsedTarget.hostname;
      if (cleanHost === parsedHost) return true;
    }

    // Check against configured APP_URL
    if (config.APP_URL) {
      const appUrl = new URL(config.APP_URL);
      if (parsedTarget.origin === appUrl.origin) return true;
    }

    // Allow localhost/127.0.0.1 in non-production
    if (config.NODE_ENV !== 'production') {
      if (parsedTarget.hostname === 'localhost' || parsedTarget.hostname === '127.0.0.1') {
        return true;
      }
    }

    // Allow all vercel.app domains (production and preview deployments)
    if (parsedTarget.hostname.endsWith('.vercel.app')) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}
