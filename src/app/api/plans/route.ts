import { handleRoute, ok } from '@/server/api-helpers';
import { planService } from '@/server/services/plan.service';

export const GET = handleRoute(async () => {
  return ok(await planService.listPlans());
});
