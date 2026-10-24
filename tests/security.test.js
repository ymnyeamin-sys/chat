import { describe, expect, test } from 'vitest';
import { sanitizeText, validateLoginPayload, validateRegisterPayload, validateMessagePayload } from '../shared/validation.js';

describe('security validation', () => {
  test('sanitizes user input', () => {
    expect(sanitizeText('   hello   world   ')).toBe('hello world');
  });

  test('validates registration payload', () => {
    expect(validateRegisterPayload({ username: 'alice', email: 'alice@example.com', password: 'secretpass' }).ok).toBe(true);
    expect(validateRegisterPayload({ username: 'ab', email: 'bad', password: 'short' }).ok).toBe(false);
  });

  test('validates login payload', () => {
    expect(validateLoginPayload({ username: 'alice', password: 'secret' }).ok).toBe(true);
    expect(validateLoginPayload({ username: '', password: '' }).ok).toBe(false);
  });

  test('validates message payload', () => {
    expect(validateMessagePayload({ content: 'hello world' }).ok).toBe(true);
    expect(validateMessagePayload({ content: '' }).ok).toBe(false);
  });
});
