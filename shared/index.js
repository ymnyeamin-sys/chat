export const API_VERSION = '/api/v1';
export const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302'
];
export const MAX_MESSAGE_LENGTH = 2000;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
export const RATE_LIMITS = {
  auth: { requests: 10, windowMs: 60_000 },
  messages: { requests: 60, windowMs: 60_000 },
  calls: { requests: 30, windowMs: 60_000 }
};
