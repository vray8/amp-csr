import { handleRoute, ok } from '@/server/api-helpers';
import { subscriptionService } from '@/server/services/subscription.service';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return ok(await subscriptionService.cancel(id));
});
