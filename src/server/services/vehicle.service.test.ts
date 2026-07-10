import { describe, expect, it, vi } from 'vitest';
import { createVehicleService } from './vehicle.service';
import { ConflictError, NotFoundError } from '@/server/errors';

function makeVehicleRepoFake() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countTransfersForVehicle: vi.fn(),
  };
}

function makeUserRepoFake() {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  };
}

function makeSubscriptionRepoFake() {
  return {
    cancelAllForUser: vi.fn(),
    findById: vi.fn(),
    findActiveByVehicle: vi.fn(),
    create: vi.fn(),
    updateVehicle: vi.fn(),
    recordTransfer: vi.fn(),
    cancel: vi.fn(),
    countByUserAndStatus: vi.fn(),
  };
}

function makeService() {
  const vehicleRepo = makeVehicleRepoFake();
  const userRepo = makeUserRepoFake();
  const subscriptionRepo = makeSubscriptionRepoFake();
  const service = createVehicleService(vehicleRepo, userRepo, subscriptionRepo);
  return { service, vehicleRepo, userRepo, subscriptionRepo };
}

describe('vehicle.service', () => {
  describe('addVehicle', () => {
    it('throws ConflictError with fieldErrors.licensePlate on a duplicate plate (P2002)', async () => {
      const { service, vehicleRepo, userRepo } = makeService();
      userRepo.findById.mockResolvedValue({ id: 'user-1' });
      vehicleRepo.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.addVehicle('user-1', {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          color: 'Blue',
          licensePlate: 'ABC1234',
        }),
      ).rejects.toMatchObject({
        message: 'License plate already registered',
        fieldErrors: { licensePlate: 'Already registered' },
      });
    });

    it('throws NotFoundError when the user does not exist', async () => {
      const { service, userRepo } = makeService();
      userRepo.findById.mockResolvedValue(null);

      await expect(
        service.addVehicle('missing-user', {
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          color: 'Blue',
          licensePlate: 'ABC1234',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteVehicle', () => {
    it('throws ConflictError when the vehicle has a non-cancelled subscription', async () => {
      const { service, vehicleRepo, subscriptionRepo } = makeService();
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1' });
      subscriptionRepo.findActiveByVehicle.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' });

      await expect(service.deleteVehicle('veh-1')).rejects.toThrow(ConflictError);
      expect(vehicleRepo.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictError when the vehicle has transfer history', async () => {
      const { service, vehicleRepo, subscriptionRepo } = makeService();
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1' });
      subscriptionRepo.findActiveByVehicle.mockResolvedValue(null);
      vehicleRepo.countTransfersForVehicle.mockResolvedValue(2);

      await expect(service.deleteVehicle('veh-1')).rejects.toThrow(ConflictError);
      expect(vehicleRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes freely when there is no active subscription and no transfer history', async () => {
      const { service, vehicleRepo, subscriptionRepo } = makeService();
      vehicleRepo.findById.mockResolvedValue({ id: 'veh-1' });
      subscriptionRepo.findActiveByVehicle.mockResolvedValue(null);
      vehicleRepo.countTransfersForVehicle.mockResolvedValue(0);
      vehicleRepo.delete.mockResolvedValue({ id: 'veh-1' });

      await service.deleteVehicle('veh-1');

      expect(vehicleRepo.delete).toHaveBeenCalledWith('veh-1');
    });

    it('throws NotFoundError when the vehicle does not exist', async () => {
      const { service, vehicleRepo } = makeService();
      vehicleRepo.findById.mockResolvedValue(null);

      await expect(service.deleteVehicle('missing-veh')).rejects.toThrow(NotFoundError);
    });
  });
});
