import { handleRoute, ok } from '@/server/api-helpers';
import { userService } from '@/server/services/user.service';

// Static `/api/users/stats` resolves ahead of the dynamic `/api/users/[id]`
// route in Next's matcher, so there's no collision with a user id of "stats".
export const GET = handleRoute(async () => ok(await userService.stats()));
