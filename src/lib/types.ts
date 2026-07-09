import type { AccountStatus } from '@/generated/prisma/enums';

// Shared frontend view of a users-list row, matching the `listSelect`
// projection in `src/server/repositories/user.repository.ts`. Dates travel
// as ISO strings once they cross the `fetch` boundary (JSON has no Date
// type), so this intentionally diverges from the Prisma-generated `User`.
export interface UserListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AccountStatus;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    subscriptions: number;
  };
}

export interface UserListResult {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}
