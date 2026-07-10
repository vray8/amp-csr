import { handleRoute, ok } from '@/server/api-helpers';
import { transferSubscriptionSchema } from '@/lib/schemas/subscription.schema';
import { subscriptionService } from '@/server/services/subscription.service';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { toVehicleId } = transferSubscriptionSchema.parse(await req.json());
  return ok(await subscriptionService.transfer(id, toVehicleId));
});
