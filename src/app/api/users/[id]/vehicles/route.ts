import { handleRoute, ok } from '@/server/api-helpers';
import { createVehicleSchema } from '@/lib/schemas/vehicle.schema';
import { vehicleService } from '@/server/services/vehicle.service';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = createVehicleSchema.parse(await req.json());
  return ok(await vehicleService.addVehicle(id, body), { status: 201 });
});
