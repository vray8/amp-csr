import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { handleRoute, ok } from './api-helpers';
import { ConflictError, NotFoundError, ValidationError } from './errors';

describe('handleRoute envelope mapping', () => {
  it('returns 200 with { data } envelope on success', async () => {
    const handler = handleRoute(async () => ok({ hello: 'world' }));
    const res = await handler(new Request('http://test'), {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ data: { hello: 'world' } });
  });

  it('returns 400 with fieldErrors on a real ZodError', async () => {
    const schema = z.object({ name: z.string().min(1), age: z.coerce.number().int() });
    const handler = handleRoute(async () => {
      schema.parse({ name: '', age: 'not-a-number' });
      return ok(null);
    });
    const res = await handler(new Request('http://test'), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION');
    expect(json.error.message).toBe('Invalid request');
    expect(json.error.fieldErrors).toHaveProperty('name');
    expect(json.error.fieldErrors).toHaveProperty('age');
  });

  it('maps NotFoundError to 404', async () => {
    const handler = handleRoute(async () => {
      throw new NotFoundError('Account', 'abc-123');
    });
    const res = await handler(new Request('http://test'), {});
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({
      error: { code: 'NOT_FOUND', message: 'Account not found: abc-123' },
    });
  });

  it('maps ConflictError (with fieldErrors) to 409', async () => {
    const handler = handleRoute(async () => {
      throw new ConflictError('Email already in use', { email: 'must be unique' });
    });
    const res = await handler(new Request('http://test'), {});
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json).toEqual({
      error: {
        code: 'CONFLICT',
        message: 'Email already in use',
        fieldErrors: { email: 'must be unique' },
      },
    });
  });

  it('maps ValidationError to 400', async () => {
    const handler = handleRoute(async () => {
      throw new ValidationError('Something is invalid');
    });
    const res = await handler(new Request('http://test'), {});
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json).toEqual({
      error: { code: 'VALIDATION', message: 'Something is invalid' },
    });
  });

  it('maps unexpected errors to a generic 500 without leaking internals', async () => {
    const handler = handleRoute(async () => {
      throw new Error('super secret internal detail');
    });
    const res = await handler(new Request('http://test'), {});
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({
      error: { code: 'INTERNAL', message: 'Internal server error' },
    });
    expect(JSON.stringify(json)).not.toContain('super secret internal detail');
  });
});
