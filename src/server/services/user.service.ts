import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/server/db';
import { ConflictError, NotFoundError } from '@/server/errors';
import type { UpdateUserInput, UserListQuery } from '@/lib/schemas/user.schema';
import { userRepository } from '@/server/repositories/user.repository';
import { subscriptionRepository } from '@/server/repositories/subscription.repository';

type UserRepo = typeof userRepository;
type SubscriptionRepo = typeof subscriptionRepository;

// Injectable so unit tests never touch the real Prisma client: the default
// wraps the actual `prisma.$transaction` batch API, while tests can pass a
// stand-in that simply awaits the (fake-repo) ops directly.
type RunTransaction = (ops: Array<PromiseLike<unknown>>) => Promise<unknown[]>;
const defaultRunTransaction: RunTransaction = (ops) =>
  // Batch-mode `$transaction` wants a tuple of PrismaPromises; `ops` here is
  // a plain array of them boxed as PromiseLike for the injectable signature
  // above, so the cast is the isolated escape hatch.
  prisma.$transaction(ops as unknown as Prisma.PrismaPromise<unknown>[]);

function isUniqueConstraintViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code?: unknown }).code === 'P2002'
  );
}

export function createUserService(
  userRepo: UserRepo,
  subscriptionRepo: SubscriptionRepo,
  runTransaction: RunTransaction = defaultRunTransaction,
) {
  async function list(query: UserListQuery) {
    const { page, pageSize, search, status, sort } = query;
    const [field, direction] = sort.split(':') as [
      'name' | 'createdAt' | 'status',
      'asc' | 'desc',
    ];

    const where: Prisma.UserWhereInput = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              {
                vehicles: {
                  some: { licensePlate: { contains: search, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput = { [field]: direction };

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const { items, total } = await userRepo.list({ where, skip, take, orderBy });
    return { items, total, page, pageSize };
  }

  async function getById(id: string) {
    const user = await userRepo.findById(id);
    if (!user) throw new NotFoundError('User', id);
    return user;
  }

  async function update(id: string, data: UpdateUserInput) {
    const existing = await userRepo.findById(id);
    if (!existing) throw new NotFoundError('User', id);

    const found = await userRepo.findByEmail(data.email);
    if (found && found.id !== id) {
      throw new ConflictError('A user with this email already exists', {
        email: 'Already in use',
      });
    }

    try {
      return await userRepo.update(id, data);
    } catch (e) {
      // Race-safe backstop: two concurrent requests could both pass the
      // findByEmail check above before either write lands. The DB's unique
      // constraint is the final word — translate its violation the same way.
      if (isUniqueConstraintViolation(e)) {
        throw new ConflictError('A user with this email already exists', {
          email: 'Already in use',
        });
      }
      throw e;
    }
  }

  async function cancel(id: string) {
    const existing = await userRepo.findById(id);
    if (!existing) throw new NotFoundError('User', id);

    if (existing.status === 'CANCELLED') {
      return existing;
    }

    const now = new Date();
    await runTransaction([subscriptionRepo.cancelAllForUser(id, now), userRepo.setStatus(id, 'CANCELLED')]);

    const updated = await userRepo.findById(id);
    if (!updated) throw new NotFoundError('User', id);
    return updated;
  }

  return { list, getById, update, cancel };
}

export const userService = createUserService(userRepository, subscriptionRepository);
