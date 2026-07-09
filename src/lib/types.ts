import type { AccountStatus, PurchaseStatus, PurchaseType, SubscriptionStatus } from '@/generated/prisma/enums';

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

// Shared frontend view of a `GET /api/users/[id]` payload, matching the
// `detailInclude` projection in `src/server/repositories/user.repository.ts`.
// Dates travel as ISO strings once they cross the `fetch` boundary, same as
// `UserListItem` above.
export interface VehicleSummary {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanSummary {
  id: string;
  name: string;
  priceCents: number;
  description: string;
}

export interface TransferRow {
  id: string;
  subscriptionId: string;
  fromVehicle: VehicleSummary;
  toVehicle: VehicleSummary;
  transferredAt: string;
}

export interface SubscriptionDetail {
  id: string;
  userId: string;
  vehicleId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: string;
  cancelledAt: string | null;
  nextBillingDate: string | null;
  createdAt: string;
  updatedAt: string;
  plan: PlanSummary;
  vehicle: VehicleSummary;
  transfers: TransferRow[];
}

export interface PurchaseRow {
  id: string;
  userId: string;
  type: PurchaseType;
  status: PurchaseStatus;
  amountCents: number;
  description: string;
  subscriptionId: string | null;
  failureReason: string | null;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: AccountStatus;
  paymentMethodBrand: string | null;
  paymentMethodLast4: string | null;
  createdAt: string;
  updatedAt: string;
  vehicles: VehicleSummary[];
  subscriptions: SubscriptionDetail[];
  // Latest FAILED purchase only (0 or 1 rows) — see `detailInclude` in
  // `user.repository.ts`. Used to power the OVERDUE banner. The full,
  // paginated purchase history comes from `usePurchases` instead.
  purchases: PurchaseRow[];
}

export interface PurchaseListResult {
  items: PurchaseRow[];
  total: number;
  page: number;
  pageSize: number;
}
