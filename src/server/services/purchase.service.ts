import { NotFoundError } from '@/server/errors';
import { userRepository } from '@/server/repositories/user.repository';
import { purchaseRepository } from '@/server/repositories/purchase.repository';

type UserRepo = typeof userRepository;
type PurchaseRepo = typeof purchaseRepository;

export interface ListUserPurchasesQuery {
  page: number;
  pageSize: number;
}

export function createPurchaseService(purchaseRepo: PurchaseRepo, userRepo: UserRepo) {
  async function listByUser(userId: string, query: ListUserPurchasesQuery) {
    const user = await userRepo.findById(userId);
    if (!user) throw new NotFoundError('User', userId);

    const { page, pageSize } = query;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const { items, total } = await purchaseRepo.listByUser(userId, { skip, take });
    return { items, total, page, pageSize };
  }

  return { listByUser };
}

export const purchaseService = createPurchaseService(purchaseRepository, userRepository);
