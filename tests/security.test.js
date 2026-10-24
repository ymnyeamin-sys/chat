import { readFileSync } from 'node:fs';

const test = await import('vitest');

const { describe, expect, it } = test;

const { validateRegisterPayload, validateLoginPayload, validateMessagePayload } = await import('../shared/index.js');

describe('validation logic', () => {
  it('accepts valid registration payloads', () => {
    const result = validateRegisterPayload({
      username: 'mim',
      email: 'mim@example.com',
      password: 'strongpass123'
    });

    expect(result.ok).toBe(true);
    expect(result.value.username).toBe('mim');
  });

  it('rejects bad usernames', () => {
    const result = validateRegisterPayload({
      username: 'ab',
      email: 'test@example.com',
      password: 'strongpass123'
    });

    expect(result.ok).toBe(false);
  });

  it('rejects empty login payloads', () => {
    const result = validateLoginPayload({ username: '', password: '' });
    expect(result.ok).toBe(false);
  });

  it('rejects empty messages', () => {
    const result = validateMessagePayload({ content: '   ' });
    expect(result.ok).toBe(false);
  });
});
