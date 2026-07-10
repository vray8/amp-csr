import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  vehicleId: z.string().min(1),
  planId: z.string().min(1),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const transferSubscriptionSchema = z.object({
  toVehicleId: z.string().min(1),
});
export type TransferSubscriptionInput = z.infer<typeof transferSubscriptionSchema>;
