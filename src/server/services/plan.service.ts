import { planRepository } from '@/server/repositories/plan.repository';

type PlanRepo = typeof planRepository;

export function createPlanService(planRepo: PlanRepo) {
  async function listPlans() {
    return planRepo.listAll();
  }

  return { listPlans };
}

export const planService = createPlanService(planRepository);
