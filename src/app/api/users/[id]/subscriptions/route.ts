import { handleRoute, ok } from '@/server/api-helpers';
import { createSubscriptionSchema } from '@/lib/schemas/subscription.schema';
import { subscriptionService } from '@/server/services/subscription.service';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = createSubscriptionSchema.parse(await req.json());
  return ok(await subscriptionService.create(id, body), { status: 201 });
});
