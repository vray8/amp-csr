import type { Prisma, PrismaClient } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { ConflictError, NotFoundError, ValidationError } from '@/server/errors';
import type { CreateSubscriptionInput } from '@/lib/schemas/subscription.schema';
import { subscriptionRepository } from '@/server/repositories/subscription.repository';
import { vehicleRepository } from '@/server/repositories/vehicle.repository';
import { planRepository } from '@/server/repositories/plan.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { purchaseRepository } from '@/server/repositories/purchase.repository';

type SubscriptionRepo = typeof subscriptionRepository;
type VehicleRepo = typeof vehicleRepository;
type PlanRepo = typeof planRepository;
type UserRepo = typeof userRepository;
type PurchaseRepo = typeof purchaseRepository;

type PrismaTx = Prisma.TransactionClient | PrismaClient;

// Injectable so unit tests never touch a real Prisma client: the default
// wraps the real `prisma.$transaction` callback API, while tests can pass a
// stand-in that just invokes the callback with a fake (or undefined) tx —
// see subscription.service.test.ts. Unlike userService's array/batch form,
// transfer/cancel/create need to read-then-write inside the transaction, so
// this uses the callback shape instead.
export type RunInTransaction = <T>(fn: (tx: PrismaTx) => Promise<T>) => Promise<T>;
const defaultRunInTransaction: RunInTransaction = (fn) => prisma.$transaction(fn);

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function createSubscriptionService(
  subscriptionRepo: SubscriptionRepo,
  vehicleRepo: VehicleRepo,
  planRepo: PlanRepo,
  userRepo: UserRepo,
  purchaseRepo: PurchaseRepo,
  runInTransaction: RunInTransaction = defaultRunInTransaction,
) {
  async function create(userId: string, input: CreateSubscriptionInput) {
    const { vehicleId, planId } = input;

    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const vehicle = await vehicleRepo.findById(vehicleId);
    if (!vehicle) throw new NotFoundError('Vehicle', vehicleId);
    if (vehicle.userId !== userId) {
      throw new ValidationError('Vehicle belongs to a different user');
    }

    const plan = await planRepo.findById(planId);
    if (!plan) throw new NotFoundError('Plan', planId);

    const existing = await subscriptionRepo.findActiveByVehicle(vehicleId);
    if (existing) throw new ConflictError('Vehicle already has a subscription');

    const now = new Date();
    const nextBillingDate = addMonths(now, 1);

    return runInTransaction(async (tx) => {
      const subscription = await subscriptionRepo.create(
        {
          userId,
          vehicleId,
          planId,
          status: 'ACTIVE',
          startedAt: now,
          nextBillingDate,
        },
        tx,
      );
      await purchaseRepo.create(
        {
          userId,
          type: 'SUBSCRIPTION_PAYMENT',
          status: 'PAID',
          amountCents: plan.priceCents,
          description: `${plan.name} Monthly — first payment`,
          subscriptionId: subscription.id,
        },
        tx,
      );
      return subscription;
    });
  }

  async function cancel(subscriptionId: string) {
    const sub = await subscriptionRepo.findById(subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);
    if (sub.status === 'CANCELLED') {
      throw new ConflictError('Subscription is already cancelled');
    }

    const now = new Date();

    return runInTransaction(async (tx) => {
      const updated = await subscriptionRepo.cancel(subscriptionId, now, tx);
      const overdueLeft = await subscriptionRepo.countByUserAndStatus(sub.userId, 'OVERDUE', tx);
      const user = await userRepo.findById(sub.userId, tx);
      if (user && user.status === 'OVERDUE' && overdueLeft === 0) {
        await userRepo.setStatus(sub.userId, 'ACTIVE', tx);
      }
      return updated;
    });
  }

  // Bring an overdue subscription current. No real payment is processed (the
  // card form is a client-side gate); this records a PAID catch-up purchase so
  // it shows in history, flips the subscription back to ACTIVE, and — mirroring
  // `cancel` — clears the account's derived OVERDUE status once no overdue
  // subscriptions remain.
  async function payOverdue(subscriptionId: string) {
    const sub = await subscriptionRepo.findById(subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);
    if (sub.status !== 'OVERDUE') {
      throw new ConflictError('Only an overdue subscription can be brought current');
    }

    const now = new Date();
    const nextBillingDate = addMonths(now, 1);

    return runInTransaction(async (tx) => {
      const updated = await subscriptionRepo.reactivate(subscriptionId, nextBillingDate, tx);
      await purchaseRepo.create(
        {
          userId: sub.userId,
          type: 'SUBSCRIPTION_PAYMENT',
          status: 'PAID',
          amountCents: sub.plan.priceCents,
          description: `${sub.plan.name} Monthly — overdue balance paid`,
          subscriptionId: sub.id,
        },
        tx,
      );
      const overdueLeft = await subscriptionRepo.countByUserAndStatus(sub.userId, 'OVERDUE', tx);
      const user = await userRepo.findById(sub.userId, tx);
      if (user && user.status === 'OVERDUE' && overdueLeft === 0) {
        await userRepo.setStatus(sub.userId, 'ACTIVE', tx);
      }
      return updated;
    });
  }

  async function transfer(subscriptionId: string, toVehicleId: string) {
    const sub = await subscriptionRepo.findById(subscriptionId);
    if (!sub) throw new NotFoundError('Subscription', subscriptionId);
    if (sub.status === 'CANCELLED') {
      throw new ConflictError('Cannot transfer a cancelled subscription');
    }
    if (sub.vehicleId === toVehicleId) {
      throw new ValidationError('Subscription is already on this vehicle');
    }

    const target = await vehicleRepo.findById(toVehicleId);
    if (!target) throw new NotFoundError('Vehicle', toVehicleId);
    if (target.userId !== sub.userId) {
      throw new ValidationError('Target vehicle belongs to a different user');
    }

    const existing = await subscriptionRepo.findActiveByVehicle(toVehicleId);
    if (existing) throw new ConflictError('Target vehicle already has a subscription');

    return runInTransaction(async (tx) => {
      const updated = await subscriptionRepo.updateVehicle(subscriptionId, toVehicleId, tx);
      await subscriptionRepo.recordTransfer(
        { subscriptionId, fromVehicleId: sub.vehicleId, toVehicleId },
        tx,
      );
      return updated;
    });
  }

  return { create, cancel, payOverdue, transfer };
}

export const subscriptionService = createSubscriptionService(
  subscriptionRepository,
  vehicleRepository,
  planRepository,
  userRepository,
  purchaseRepository,
);
