import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserStats } from '@/lib/types';

// Subscription-status counts for the dashboard stat strip. Shares the
// ['users'] key prefix so account/subscription mutations that invalidate
// ['users'] also refresh these totals (e.g. cancelling an account cascades to
// its subscriptions, moving it into the Cancelled tile).
export function useUserStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => api<UserStats>('/api/users/stats'),
    staleTime: 30_000,
  });
}
