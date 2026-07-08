import { prisma } from '@/server/db';
import type { PrismaTx } from './user.repository';
import type { CreateVehicleInput, UpdateVehicleInput } from '@/lib/schemas/vehicle.schema';

function create(userId: string, data: CreateVehicleInput, tx: PrismaTx = prisma) {
  return tx.vehicle.create({ data: { ...data, userId } });
}

function findById(id: string, tx: PrismaTx = prisma) {
  return tx.vehicle.findUnique({ where: { id } });
}

function update(id: string, data: UpdateVehicleInput, tx: PrismaTx = prisma) {
  return tx.vehicle.update({ where: { id }, data });
}

function del(id: string, tx: PrismaTx = prisma) {
  return tx.vehicle.delete({ where: { id } });
}

// Counts how many SubscriptionTransfer rows reference this vehicle, either as
// the origin or the destination — used to block deletion of vehicles with
// transfer history (see vehicle.service `deleteVehicle`).
async function countTransfersForVehicle(vehicleId: string, tx: PrismaTx = prisma): Promise<number> {
  return tx.subscriptionTransfer.count({
    where: { OR: [{ fromVehicleId: vehicleId }, { toVehicleId: vehicleId }] },
  });
}

export const vehicleRepository = {
  create,
  findById,
  update,
  delete: del,
  countTransfersForVehicle,
};
