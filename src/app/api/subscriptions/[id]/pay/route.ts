import { handleRoute, ok } from '@/server/api-helpers';
import { subscriptionService } from '@/server/services/subscription.service';

type Ctx = { params: Promise<{ id: string }> };

// Takes no body on purpose: card details are validated client-side only and
// never transmitted or stored (no real payment processing). This just brings
// the overdue subscription current.
export const POST = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return ok(await subscriptionService.payOverdue(id));
});
