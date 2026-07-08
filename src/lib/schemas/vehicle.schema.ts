import { z } from 'zod';

export const createVehicleSchema = z.object({
  make: z.string().min(1).max(50),
  model: z.string().min(1).max(50),
  year: z.coerce.number().int().min(1980).max(2030),
  color: z.string().min(1).max(30),
  licensePlate: z
    .string()
    .min(2)
    .max(10)
    .transform((s) => s.toUpperCase()),
});
export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
