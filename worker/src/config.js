export const AUTH_COOKIE_NAME = 'bondhuchat_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
export const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function getCorsHeaders(origin = '*') {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie'
  };
}
