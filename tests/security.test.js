import { describe, expect, test } from 'vitest';
import { sanitizeText, validateLoginPayload, validateMessagePayload, validateRegisterPayload } from '../shared/validation.js';

describe('security validation', () => {
  test('sanitizes whitespace-heavy user input', () => {
    expect(sanitizeText('   hello   world   ')).toBe('hello world');
  });

  test('accepts valid registration data', () => {
    expect(validateRegisterPayload({
      username: 'alice',
      email: 'alice@example.com',
      password: 'supersecret123'
    }).ok).toBe(true);
  });

  test('rejects invalid registration data', () => {
    expect(validateRegisterPayload({
      username: 'ab',
      email: 'bad-email',
      password: 'short'
    }).ok).toBe(false);
  });

  test('accepts valid login data', () => {
    expect(validateLoginPayload({ username: 'alice', password: 'supersecret123' }).ok).toBe(true);
  });

  test('rejects missing message content', () => {
    expect(validateMessagePayload({ content: '' }).ok).toBe(false);
  });
});
