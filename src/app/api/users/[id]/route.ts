import { handleRoute, ok } from '@/server/api-helpers';
import { updateUserSchema } from '@/lib/schemas/user.schema';
import { userService } from '@/server/services/user.service';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  return ok(await userService.getById(id));
});

export const PATCH = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const body = updateUserSchema.parse(await req.json());
  return ok(await userService.update(id, body));
});
