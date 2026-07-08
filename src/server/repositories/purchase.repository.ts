import { prisma } from '@/server/db';

export interface ListPurchasesParams {
  skip: number;
  take: number;
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

export const purchaseRepository = { listByUser };
