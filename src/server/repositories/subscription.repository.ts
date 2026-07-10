import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import type { PrismaTx } from './user.repository';
import type { SubscriptionStatus } from '@/generated/prisma/enums';

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

const detailInclude = {
  vehicle: true,
  plan: true,
  transfers: {
    include: { fromVehicle: true, toVehicle: true },
    orderBy: { transferredAt: 'desc' as const },
  },
} satisfies Prisma.SubscriptionInclude;

function findById(id: string, tx: PrismaTx = prisma) {
  return tx.subscription.findUnique({ where: { id }, include: detailInclude });
}

// The vehicle's current non-cancelled subscription, if any — a vehicle may
// only carry one active subscription at a time.
function findActiveByVehicle(vehicleId: string, tx: PrismaTx = prisma) {
  return tx.subscription.findFirst({
    where: { vehicleId, status: { not: 'CANCELLED' } },
  });
}

export interface CreateSubscriptionData {
  userId: string;
  vehicleId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: Date;
  nextBillingDate: Date;
}

function create(data: CreateSubscriptionData, tx: PrismaTx = prisma) {
  return tx.subscription.create({ data });
}

function updateVehicle(subscriptionId: string, toVehicleId: string, tx: PrismaTx = prisma) {
  return tx.subscription.update({
    where: { id: subscriptionId },
    data: { vehicleId: toVehicleId },
    include: detailInclude,
  });
}

export interface RecordTransferData {
  subscriptionId: string;
  fromVehicleId: string;
  toVehicleId: string;
}

function recordTransfer(data: RecordTransferData, tx: PrismaTx = prisma) {
  return tx.subscriptionTransfer.create({ data });
}

function cancel(subscriptionId: string, now: Date, tx: PrismaTx = prisma) {
  return tx.subscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED', cancelledAt: now },
    include: detailInclude,
  });
}

function countByUserAndStatus(userId: string, status: SubscriptionStatus, tx: PrismaTx = prisma) {
  return tx.subscription.count({ where: { userId, status } });
}

export const subscriptionRepository = {
  cancelAllForUser,
  findById,
  findActiveByVehicle,
  create,
  updateVehicle,
  recordTransfer,
  cancel,
  countByUserAndStatus,
};
