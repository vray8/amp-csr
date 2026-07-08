import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ConflictError, DomainError, NotFoundError, ValidationError } from './errors';

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

function statusFor(e: DomainError): number {
  if (e instanceof NotFoundError) return 404;
  if (e instanceof ConflictError) return 409;
  if (e instanceof ValidationError) return 400;
  return 500;
}

// Wrap every route handler body. Usage:
//   export const GET = handleRoute(async (req, ctx) => { ... return ok(result) })
//
// Next 16 gotcha: dynamic route context is `{ params: Promise<{ id: string }> }`
// (params is now async) — handlers must `await ctx.params` before reading
// individual segment values, e.g. `const { id } = await ctx.params;`.
export function handleRoute<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<NextResponse>,
) {
  return async (req: Request, ctx: Ctx): Promise<NextResponse> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of e.issues) fieldErrors[issue.path.join('.')] = issue.message;
        return NextResponse.json(
          { error: { code: 'VALIDATION', message: 'Invalid request', fieldErrors } },
          { status: 400 },
        );
      }
      if (e instanceof DomainError) {
        return NextResponse.json(
          {
            error: {
              code: e.code,
              message: e.message,
              ...(e instanceof ConflictError && e.fieldErrors ? { fieldErrors: e.fieldErrors } : {}),
            },
          },
          { status: statusFor(e) },
        );
      }
      console.error('Unhandled API error:', e);
      return NextResponse.json(
        { error: { code: 'INTERNAL', message: 'Internal server error' } },
        { status: 500 },
      );
    }
  };
}
