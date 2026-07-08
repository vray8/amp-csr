// THROWAWAY demo route — proves the handleRoute()/ok() envelope end-to-end.
// AMP-4 deletes this file once real endpoints replace it.
//
// NOTE: the ticket's example path used `_demo`, but Next.js App Router treats
// any `_`-prefixed folder as a "private folder" excluded from routing, so
// `src/app/api/_demo/route.ts` never actually resolves. Using `demo` (no
// underscore) here instead so the route is reachable at /api/demo.
//
// Deliberately does NOT touch the database (no PrismaClient import) — routes
// under src/app/api/** must never import PrismaClient directly, they should
// go through the `prisma` singleton exported from `@/server/db` instead.
import { z } from 'zod';
import { handleRoute, ok } from '@/server/api-helpers';
import { ConflictError, NotFoundError, ValidationError } from '@/server/errors';

const modeSchema = z.object({
  mode: z
    .enum(['success', 'notfound', 'conflict', 'validation', 'zod', 'crash'])
    .default('success'),
});

export const GET = handleRoute(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const { mode } = modeSchema.parse(Object.fromEntries(searchParams));

  switch (mode) {
    case 'success':
      return ok({ message: 'it works', mode });
    case 'notfound':
      throw new NotFoundError('Demo', 'demo-id-123');
    case 'conflict':
      throw new ConflictError('Demo conflict', { field: 'already taken' });
    case 'validation':
      throw new ValidationError('Demo validation failure');
    case 'zod':
      // Force a real ZodError by parsing something we know is invalid.
      z.object({ requiredField: z.string().min(1) }).parse({});
      return ok(null);
    case 'crash':
      // Simulate an unexpected, non-domain error — should map to a generic 500.
      throw new Error('unexpected internal failure with sensitive detail');
  }
});
