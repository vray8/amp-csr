import { describe, expect, it, vi } from 'vitest';
import { createSubscriptionService, type RunInTransaction } from './subscription.service';
import { ConflictError, NotFoundError, ValidationError } from '@/server/errors';

function makeSubscriptionRepoFake() {
  return {
    cancelAllForUser: vi.fn(),
    findById: vi.fn(),
    findActiveByVehicle: vi.fn(),
    countByVehicle: vi.fn(),
    create: vi.fn(),
    updateVehicle: vi.fn(),
    recordTransfer: vi.fn(),
    cancel: vi.fn(),
    countByUserAndStatus: vi.fn(),
  };
}

function makeVehicleRepoFake() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countTransfersForVehicle: vi.fn(),
  };
}

function makePlanRepoFake() {
  return { findById: vi.fn(), listAll: vi.fn() };
}

function makeUserRepoFake() {
  return {
    list: vi.fn(),
    countBySubscriptionStatus: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  };
}

function makePurchaseRepoFake() {
  return { listByUser: vi.fn(), create: vi.fn() };
}

// Keep the real prisma.$transaction out of the unit test path: this fake
// just invokes the callback with `undefined` in place of a real tx client,
// matching the ticket's guidance for testing the callback-shaped
// runInTransaction injectable. Built fresh per test (via makeService) so
// call-count assertions never leak across tests.
function makeRunInTransactionFake(): RunInTransaction {
  return vi.fn((fn: (tx: never) => Promise<unknown>) => fn(undefined as never)) as unknown as RunInTransaction;
}

function makeService() {
  const subscriptionRepo = makeSubscriptionRepoFake();
  const vehicleRepo = makeVehicleRepoFake();
  const planRepo = makePlanRepoFake();
  const userRepo = makeUserRepoFake();
  const purchaseRepo = makePurchaseRepoFake();
  const runInTransactionFake = makeRunInTransactionFake();
  const service = createSubscriptionService(
    subscriptionRepo,
    vehicleRepo,
    planRepo,
    userRepo,
    purchaseRepo,
    runInTransactionFake,
  );
  return { service, subscriptionRepo, vehicleRepo, planRepo, userRepo, purchaseRepo, runInTransactionFake };
}

describe('subscription.service', () => {
  describe('transfer', () => {
    it('happy path: updates the vehicle and records the audit row in the same tx', async () => {
      const { service, subscriptionRepo, vehicleRepo, runInTransactionFake } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-old', status: 'ACTIVE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      subscriptionRepo.findActiveByVehicle.mockResolvedValue(null);
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-new', userId: 'user-1' });
      const updatedSub = { ...sub, vehicleId: 'veh-new' };
      subscriptionRepo.updateVehicle.mockResolvedValue(updatedSub);

      const result = await service.transfer('sub-1', 'veh-new');

      expect(subscriptionRepo.updateVehicle).toHaveBeenCalledWith('sub-1', 'veh-new', undefined);
      expect(subscriptionRepo.recordTransfer).toHaveBeenCalledWith(
        { subscriptionId: 'sub-1', fromVehicleId: 'veh-old', toVehicleId: 'veh-new' },
        undefined,
      );
      expect(runInTransactionFake).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedSub);
    });

    it('throws ConflictError when the target vehicle already has an active subscription', async () => {
      const { service, subscriptionRepo, vehicleRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-old', status: 'ACTIVE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-new', userId: 'user-1' });
      subscriptionRepo.findActiveByVehicle.mockResolvedValue({ id: 'sub-other', status: 'ACTIVE' });

      await expect(service.transfer('sub-1', 'veh-new')).rejects.toThrow(ConflictError);
      expect(subscriptionRepo.updateVehicle).not.toHaveBeenCalled();
      expect(subscriptionRepo.recordTransfer).not.toHaveBeenCalled();
    });

    it('throws ValidationError when the target vehicle belongs to a different user (cross-owner)', async () => {
      const { service, subscriptionRepo, vehicleRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-old', status: 'ACTIVE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-new', userId: 'user-2' });

      await expect(service.transfer('sub-1', 'veh-new')).rejects.toThrow(ValidationError);
      expect(subscriptionRepo.findActiveByVehicle).not.toHaveBeenCalled();
      expect(subscriptionRepo.updateVehicle).not.toHaveBeenCalled();
    });

    it('throws ConflictError when the subscription is already CANCELLED', async () => {
      const { service, subscriptionRepo, vehicleRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-old', status: 'CANCELLED' };
      subscriptionRepo.findById.mockResolvedValue(sub);

      await expect(service.transfer('sub-1', 'veh-new')).rejects.toThrow(ConflictError);
      expect(vehicleRepo.findById).not.toHaveBeenCalled();
      expect(subscriptionRepo.updateVehicle).not.toHaveBeenCalled();
    });

    it('throws ValidationError when the target vehicle is the same as the current vehicle', async () => {
      const { service, subscriptionRepo, vehicleRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-old', status: 'ACTIVE' };
      subscriptionRepo.findById.mockResolvedValue(sub);

      await expect(service.transfer('sub-1', 'veh-old')).rejects.toThrow(ValidationError);
      expect(vehicleRepo.findById).not.toHaveBeenCalled();
      expect(subscriptionRepo.updateVehicle).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when the subscription does not exist', async () => {
      const { service, subscriptionRepo } = makeService();
      subscriptionRepo.findById.mockResolvedValue(null);

      await expect(service.transfer('missing-sub', 'veh-new')).rejects.toThrow(NotFoundError);
    });

    it('throws NotFoundError when the target vehicle does not exist', async () => {
      const { service, subscriptionRepo, vehicleRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-old', status: 'ACTIVE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      vehicleRepo.findById.mockResolvedValue(null);

      await expect(service.transfer('sub-1', 'veh-missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('cancel', () => {
    it('clears the user OVERDUE status when this was the last overdue subscription', async () => {
      const { service, subscriptionRepo, userRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-1', status: 'OVERDUE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      const cancelledSub = { ...sub, status: 'CANCELLED', cancelledAt: expect.any(Date) };
      subscriptionRepo.cancel.mockResolvedValue(cancelledSub);
      subscriptionRepo.countByUserAndStatus.mockResolvedValue(0);
      userRepo.findById.mockResolvedValue({ id: 'user-1', status: 'OVERDUE' });

      const result = await service.cancel('sub-1');

      expect(subscriptionRepo.cancel).toHaveBeenCalledWith('sub-1', expect.any(Date), undefined);
      expect(subscriptionRepo.countByUserAndStatus).toHaveBeenCalledWith('user-1', 'OVERDUE', undefined);
      expect(userRepo.setStatus).toHaveBeenCalledWith('user-1', 'ACTIVE', undefined);
      expect(result).toEqual(cancelledSub);
    });

    it('leaves the user OVERDUE when another overdue subscription remains', async () => {
      const { service, subscriptionRepo, userRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-1', status: 'OVERDUE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      subscriptionRepo.cancel.mockResolvedValue({ ...sub, status: 'CANCELLED' });
      subscriptionRepo.countByUserAndStatus.mockResolvedValue(1);
      userRepo.findById.mockResolvedValue({ id: 'user-1', status: 'OVERDUE' });

      await service.cancel('sub-1');

      expect(userRepo.setStatus).not.toHaveBeenCalled();
    });

    it('does not touch user status when the user was not OVERDUE', async () => {
      const { service, subscriptionRepo, userRepo } = makeService();
      const sub = { id: 'sub-1', userId: 'user-1', vehicleId: 'veh-1', status: 'ACTIVE' };
      subscriptionRepo.findById.mockResolvedValue(sub);
      subscriptionRepo.cancel.mockResolvedValue({ ...sub, status: 'CANCELLED' });
      subscriptionRepo.countByUserAndStatus.mockResolvedValue(0);
      userRepo.findById.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });

      await service.cancel('sub-1');

      expect(userRepo.setStatus).not.toHaveBeenCalled();
    });

    it('throws ConflictError when cancelling an already-cancelled subscription', async () => {
      const { service, subscriptionRepo } = makeService();
      subscriptionRepo.findById.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        vehicleId: 'veh-1',
        status: 'CANCELLED',
      });

      await expect(service.cancel('sub-1')).rejects.toThrow(ConflictError);
      expect(subscriptionRepo.cancel).not.toHaveBeenCalled();
    });

    it('throws NotFoundError for an unknown subscription', async () => {
      const { service, subscriptionRepo } = makeService();
      subscriptionRepo.findById.mockResolvedValue(null);

      await expect(service.cancel('missing-sub')).rejects.toThrow(NotFoundError);
    });
  });

  describe('create', () => {
    it('throws ValidationError when the vehicle belongs to a different user', async () => {
      const { service, userRepo, vehicleRepo } = makeService();
      userRepo.findById.mockResolvedValue({ id: 'user-1' });
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1', userId: 'user-2' });

      await expect(
        service.create('user-1', { vehicleId: 'veh-1', planId: 'plan-1' }),
      ).rejects.toThrow(ValidationError);
    });

    it('throws ConflictError when the vehicle already has an active subscription', async () => {
      const { service, userRepo, vehicleRepo, planRepo, subscriptionRepo } = makeService();
      userRepo.findById.mockResolvedValue({ id: 'user-1' });
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1', userId: 'user-1' });
      planRepo.findById.mockResolvedValue({ id: 'plan-1', name: 'Basic', priceCents: 999 });
      subscriptionRepo.findActiveByVehicle.mockResolvedValue({ id: 'sub-existing' });

      await expect(
        service.create('user-1', { vehicleId: 'veh-1', planId: 'plan-1' }),
      ).rejects.toThrow(ConflictError);
    });

    it('throws NotFoundError for an unknown plan', async () => {
      const { service, userRepo, vehicleRepo, planRepo } = makeService();
      userRepo.findById.mockResolvedValue({ id: 'user-1' });
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1', userId: 'user-1' });
      planRepo.findById.mockResolvedValue(null);

      await expect(
        service.create('user-1', { vehicleId: 'veh-1', planId: 'missing-plan' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('happy path: writes the subscription and an initial PAID purchase in one transaction', async () => {
      const { service, userRepo, vehicleRepo, planRepo, subscriptionRepo, purchaseRepo, runInTransactionFake } =
        makeService();
      userRepo.findById.mockResolvedValue({ id: 'user-1' });
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1', userId: 'user-1' });
      planRepo.findById.mockResolvedValue({ id: 'plan-1', name: 'Basic', priceCents: 999 });
      subscriptionRepo.findActiveByVehicle.mockResolvedValue(null);
      const createdSub = { id: 'sub-new', userId: 'user-1', vehicleId: 'veh-1', planId: 'plan-1' };
      subscriptionRepo.create.mockResolvedValue(createdSub);

      const result = await service.create('user-1', { vehicleId: 'veh-1', planId: 'plan-1' });

      expect(subscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          vehicleId: 'veh-1',
          planId: 'plan-1',
          status: 'ACTIVE',
          startedAt: expect.any(Date),
          nextBillingDate: expect.any(Date),
        }),
        undefined,
      );
      expect(purchaseRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'SUBSCRIPTION_PAYMENT',
          status: 'PAID',
          amountCents: 999,
          description: 'Basic Monthly — first payment',
          subscriptionId: 'sub-new',
        }),
        undefined,
      );
      expect(runInTransactionFake).toHaveBeenCalledTimes(1);
      expect(result).toEqual(createdSub);
    });
  });
});
