import { describe, expect, it, vi } from 'vitest';
import { createUserService } from './user.service';
import { NotFoundError } from '@/server/errors';

function makeUserRepoFake() {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    findByEmail: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
  };
}

function makeSubscriptionRepoFake() {
  return { cancelAllForUser: vi.fn() };
}

// Keep the real prisma.$transaction out of the unit test path: this fake
// just resolves whatever ops the service handed it, same shape as the
// batch API's return, without touching a real Prisma client.
const runTransactionFake = vi.fn((ops: Array<PromiseLike<unknown>>) => Promise.all(ops));

describe('user.service', () => {
  describe('update', () => {
    it('throws ConflictError with fieldErrors.email when the new email belongs to another user', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      userRepo.findByEmail.mockResolvedValue({ id: 'user-2', email: 'taken@example.com' });

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await expect(
        service.update('user-1', { name: 'A', email: 'taken@example.com', phone: '555-0100' }),
      ).rejects.toMatchObject({
        message: 'A user with this email already exists',
        fieldErrors: { email: 'Already in use' },
      });
      expect(userRepo.update).not.toHaveBeenCalled();
    });

    it('allows keeping your own current email (found.id === id)', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      userRepo.findByEmail.mockResolvedValue({ id: 'user-1', email: 'me@example.com' });
      userRepo.update.mockResolvedValue({ id: 'user-1', email: 'me@example.com' });

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      const result = await service.update('user-1', {
        name: 'A',
        email: 'me@example.com',
        phone: '555-0100',
      });
      expect(result).toEqual({ id: 'user-1', email: 'me@example.com' });
    });

    it('rethrows a Prisma P2002 unique-constraint race as ConflictError (backstop)', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById.mockResolvedValue({ id: 'user-1', status: 'ACTIVE' });
      userRepo.findByEmail.mockResolvedValue(null); // no conflict seen by the pre-check
      userRepo.update.mockRejectedValue({ code: 'P2002' }); // but the DB races us

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await expect(
        service.update('user-1', { name: 'A', email: 'raced@example.com', phone: '555-0100' }),
      ).rejects.toMatchObject({
        message: 'A user with this email already exists',
        fieldErrors: { email: 'Already in use' },
      });
    });

    it('throws NotFoundError when the user does not exist', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById.mockResolvedValue(null);

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await expect(
        service.update('missing-id', { name: 'A', email: 'a@example.com', phone: '555-0100' }),
      ).rejects.toThrow(NotFoundError);
      expect(userRepo.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('throws NotFoundError for an unknown id', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById.mockResolvedValue(null);

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await expect(service.getById('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('returns the user detail when found', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      const detail = { id: 'user-1', name: 'Ada Lovelace', vehicles: [], subscriptions: [] };
      userRepo.findById.mockResolvedValue(detail);

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await expect(service.getById('user-1')).resolves.toEqual(detail);
    });
  });

  describe('cancel', () => {
    it('cascades: cancels all subscriptions and sets the user CANCELLED', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById
        .mockResolvedValueOnce({ id: 'user-1', status: 'ACTIVE' }) // pre-check
        .mockResolvedValueOnce({ id: 'user-1', status: 'CANCELLED' }); // post-transaction re-read

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);
      const result = await service.cancel('user-1');

      expect(subscriptionRepo.cancelAllForUser).toHaveBeenCalledWith('user-1', expect.any(Date));
      expect(userRepo.setStatus).toHaveBeenCalledWith('user-1', 'CANCELLED');
      expect(runTransactionFake).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'user-1', status: 'CANCELLED' });
    });

    it('is idempotent: cancelling an already-CANCELLED user is a no-op returning current state', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      const alreadyCancelled = { id: 'user-1', status: 'CANCELLED' };
      userRepo.findById.mockResolvedValue(alreadyCancelled);

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);
      const result = await service.cancel('user-1');

      expect(subscriptionRepo.cancelAllForUser).not.toHaveBeenCalled();
      expect(userRepo.setStatus).not.toHaveBeenCalled();
      expect(result).toBe(alreadyCancelled);
    });

    it('throws NotFoundError for an unknown id', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.findById.mockResolvedValue(null);

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await expect(service.cancel('missing-id')).rejects.toThrow(NotFoundError);
      expect(subscriptionRepo.cancelAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    it('passes parsed where/skip/take/orderBy through to the repository', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.list.mockResolvedValue({ items: [{ id: 'user-1' }], total: 1 });

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      const result = await service.list({
        page: 2,
        pageSize: 10,
        search: 'smith',
        status: 'ACTIVE',
        sort: 'name:asc',
      });

      expect(userRepo.list).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: 'smith', mode: 'insensitive' } },
            { email: { contains: 'smith', mode: 'insensitive' } },
            { phone: { contains: 'smith' } },
            { vehicles: { some: { licensePlate: { contains: 'smith', mode: 'insensitive' } } } },
          ],
        },
        skip: 10,
        take: 10,
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual({ items: [{ id: 'user-1' }], total: 1, page: 2, pageSize: 10 });
    });

    it('omits status/search from the where-clause when absent, and applies the default sort', async () => {
      const userRepo = makeUserRepoFake();
      const subscriptionRepo = makeSubscriptionRepoFake();
      userRepo.list.mockResolvedValue({ items: [], total: 0 });

      const service = createUserService(userRepo, subscriptionRepo, runTransactionFake);

      await service.list({ page: 1, pageSize: 25, sort: 'createdAt:desc' });

      expect(userRepo.list).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 25,
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
