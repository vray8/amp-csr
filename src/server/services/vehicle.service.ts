import { ConflictError, NotFoundError } from '@/server/errors';
import type { CreateVehicleInput, UpdateVehicleInput } from '@/lib/schemas/vehicle.schema';
import { vehicleRepository } from '@/server/repositories/vehicle.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { subscriptionRepository } from '@/server/repositories/subscription.repository';

type VehicleRepo = typeof vehicleRepository;
type UserRepo = typeof userRepository;
type SubscriptionRepo = typeof subscriptionRepository;

function isUniqueConstraintViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: unknown }).code === 'P2002'
  );
}

const DUPLICATE_PLATE_ERROR = () =>
  new ConflictError('License plate already registered', { licensePlate: 'Already registered' });

export function createVehicleService(
  vehicleRepo: VehicleRepo,
  userRepo: UserRepo,
  subscriptionRepo: SubscriptionRepo,
) {
  async function addVehicle(userId: string, data: CreateVehicleInput) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    try {
      return await vehicleRepo.create(userId, data);
    } catch (e) {
      if (isUniqueConstraintViolation(e)) throw DUPLICATE_PLATE_ERROR();
      throw e;
    }
  }

  async function updateVehicle(id: string, data: UpdateVehicleInput) {
    const existing = await vehicleRepo.findById(id);
    if (!existing) throw new NotFoundError('Vehicle', id);

    try {
      return await vehicleRepo.update(id, data);
    } catch (e) {
      if (isUniqueConstraintViolation(e)) throw DUPLICATE_PLATE_ERROR();
      throw e;
    }
  }

  async function deleteVehicle(id: string) {
    const existing = await vehicleRepo.findById(id);
    if (!existing) throw new NotFoundError('Vehicle', id);

    const activeSub = await subscriptionRepo.findActiveByVehicle(id);
    if (activeSub) {
      throw new ConflictError('Vehicle has a subscription — cancel or transfer it first');
    }

    const transferCount = await vehicleRepo.countTransfersForVehicle(id);
    if (transferCount > 0) {
      throw new ConflictError('Vehicle has transfer history and cannot be deleted');
    }

    return vehicleRepo.delete(id);
  }

  return { addVehicle, updateVehicle, deleteVehicle };
}

export const vehicleService = createVehicleService(vehicleRepository, userRepository, subscriptionRepository);
