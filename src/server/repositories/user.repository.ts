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
  _count: {
    select: {
      subscriptions: { where: { status: 'ACTIVE' as const } },
    },
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
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, skip, take, orderBy, select: listSelect }),
  ]);
  return { items, total };
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

export const userRepository = { list, findById, findByEmail, update, setStatus };
