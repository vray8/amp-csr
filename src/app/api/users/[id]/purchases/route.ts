import { handleRoute, ok } from '@/server/api-helpers';
import { paginationSchema } from '@/lib/schemas/common.schema';
import { purchaseService } from '@/server/services/purchase.service';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handleRoute(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const query = paginationSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await purchaseService.listByUser(id, query));
});
