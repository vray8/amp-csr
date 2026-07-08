import { prisma } from '@/server/db';
import type { PrismaTx } from './user.repository';

// Not `async` on purpose: this must return the raw Prisma query promise (not
// a wrapped native Promise) so it can be composed into
// `prisma.$transaction([...])` batches by callers, as it is in
// userService.cancel().
function cancelAllForUser(userId: string, now: Date, tx: PrismaTx = prisma) {
  return tx.subscription.updateMany({
    where: { userId, status: { not: 'CANCELLED' } },
    data: { status: 'CANCELLED', cancelledAt: now },
  });
}

export const subscriptionRepository = { cancelAllForUser };
