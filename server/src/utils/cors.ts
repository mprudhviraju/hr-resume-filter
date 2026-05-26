/** Comma-separated origins, or "*" for all. */
export function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw || raw === '*') {
    return ['*'];
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function isOriginAllowed(origin: string | undefined): boolean {
  const allowed = parseAllowedOrigins();
  if (allowed.includes('*')) {
    return true;
  }
  if (!origin) {
    return false;
  }
  return allowed.includes(origin);
}

export function corsHeaders(origin?: string): Record<string, string> {
  const allowed = parseAllowedOrigins();
  let allowOrigin = '*';
  if (!allowed.includes('*')) {
    allowOrigin =
      origin && allowed.includes(origin) ? origin : (allowed[0] ?? '*');
  } else if (origin) {
    allowOrigin = origin;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, X-OpenAI-API-Key',
    'Access-Control-Expose-Headers': 'X-OpenAI-API-Key',
  };
}
