import type { PurchaseStatus, PurchaseType } from '@/generated/prisma/enums';
import { prisma } from '@/server/db';
import type { PrismaTx } from './user.repository';

export interface ListPurchasesParams {
  skip: number;
  take: number;
}

export interface CreatePurchaseData {
  userId: string;
  type: PurchaseType;
  status: PurchaseStatus;
  amountCents: number;
  description: string;
  subscriptionId?: string;
}

function create(data: CreatePurchaseData, tx: PrismaTx = prisma) {
  return tx.purchase.create({ data });
}

async function listByUser(userId: string, params: ListPurchasesParams) {
  const { skip, take } = params;
  const [total, items] = await prisma.$transaction([
    prisma.purchase.count({ where: { userId } }),
    prisma.purchase.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { items, total };
}

export const purchaseRepository = { listByUser, create };
