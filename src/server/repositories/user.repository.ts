import { Prisma, PrismaClient } from '@/generated/prisma/client';
import type { AccountStatus } from '@/generated/prisma/enums';
import { prisma } from '@/server/db';

export type PrismaTx = Prisma.TransactionClient | PrismaClient;

const listSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  status: true,
  paymentMethodBrand: true,
  paymentMethodLast4: true,
  createdAt: true,
  updatedAt: true,
  // The user's current subscription (most recent by creation) drives the
  // Status column in the users table. Account status and subscription status
  // are distinct concepts; the list surfaces the subscription's status.
  subscriptions: {
    select: { status: true },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.UserSelect;

const detailInclude = {
  vehicles: true,
  subscriptions: {
    include: {
      plan: true,
      vehicle: true,
      transfers: {
        include: { fromVehicle: true, toVehicle: true },
        orderBy: { transferredAt: 'desc' as const },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  // Latest FAILED purchase only, so the AMP-7 OVERDUE banner can render
  // straight from the detail payload without waiting on the separate
  // paginated purchases query.
  purchases: {
    where: { status: 'FAILED' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 1,
  },
} satisfies Prisma.UserInclude;

export interface ListUsersParams {
  where: Prisma.UserWhereInput;
  skip: number;
  take: number;
  orderBy: Prisma.UserOrderByWithRelationInput;
}

async function list(params: ListUsersParams) {
  const { where, skip, take, orderBy } = params;
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip, take, orderBy, select: listSelect }),
  ]);
  // Flatten the take-1 subscriptions relation into a single status field
  // (null when the user has no subscriptions) to match `UserListItem`.
  const items = rows.map(({ subscriptions, ...user }) => ({
    ...user,
    subscriptionStatus: subscriptions[0]?.status ?? null,
  }));
  return { items, total };
}

// Customers bucketed by the status of their *current* subscription (the most
// recent one — same representative the users-table Status column uses), for
// the dashboard stat strip. `total` stays the customer count; a customer
// whose current subscription is PAUSED, or who has no subscription at all,
// contributes to `total` but to none of the three status buckets. Done as a
// single lightweight scan + in-memory reduce because "most recent per user"
// can't be expressed as a Prisma groupBy.
async function countBySubscriptionStatus() {
  const users = await prisma.user.findMany({
    select: {
      subscriptions: { select: { status: true }, orderBy: { createdAt: 'desc' as const }, take: 1 },
    },
  });
  const counts = { total: users.length, active: 0, overdue: 0, cancelled: 0 };
  for (const u of users) {
    switch (u.subscriptions[0]?.status) {
      case 'ACTIVE':
        counts.active++;
        break;
      case 'OVERDUE':
        counts.overdue++;
        break;
      case 'CANCELLED':
        counts.cancelled++;
        break;
    }
  }
  return counts;
}

function findById(id: string, tx: PrismaTx = prisma) {
  return tx.user.findUnique({ where: { id }, include: detailInclude });
}

function findByEmail(email: string, tx: PrismaTx = prisma) {
  return tx.user.findUnique({ where: { email } });
}

function update(id: string, data: { name: string; email: string; phone: string }, tx: PrismaTx = prisma) {
  return tx.user.update({ where: { id }, data });
}

// Not `async` on purpose: when called without an explicit `tx`, this must
// return the raw Prisma query promise (not a wrapped native Promise) so it
// can be composed into `prisma.$transaction([...])` batches by callers, as
// it is in userService.cancel().
function setStatus(id: string, status: AccountStatus, tx: PrismaTx = prisma) {
  return tx.user.update({ where: { id }, data: { status } });
}

export const userRepository = { list, countBySubscriptionStatus, findById, findByEmail, update, setStatus };
