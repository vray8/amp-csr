import { handleRoute, ok } from '@/server/api-helpers';
import { userService } from '@/server/services/user.service';

type Ctx = { params: Promise<{ id: string }> };

export const POST = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return ok(await userService.cancel(id));
});
