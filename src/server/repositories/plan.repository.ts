import { prisma } from '@/server/db';
import type { PrismaTx } from './user.repository';

function findById(id: string, tx: PrismaTx = prisma) {
  return tx.plan.findUnique({ where: { id } });
}

function listAll(tx: PrismaTx = prisma) {
  return tx.plan.findMany({ orderBy: { priceCents: 'asc' } });
}

export const planRepository = { findById, listAll };
