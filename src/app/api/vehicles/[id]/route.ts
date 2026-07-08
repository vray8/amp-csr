import { handleRoute, ok } from '@/server/api-helpers';
import { updateVehicleSchema } from '@/lib/schemas/vehicle.schema';
import { vehicleService } from '@/server/services/vehicle.service';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = updateVehicleSchema.parse(await req.json());
  return ok(await vehicleService.updateVehicle(id, body));
});

export const DELETE = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await vehicleService.deleteVehicle(id);
  return ok({ id });
});
