import { handleRoute, ok } from '@/server/api-helpers';
import { userListQuerySchema } from '@/lib/schemas/user.schema';
import { userService } from '@/server/services/user.service';

export const GET = handleRoute(async (req: Request) => {
  const query = userListQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return ok(await userService.list(query));
});
