import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserStats } from '@/lib/types';

// Account-status counts for the dashboard stat strip. Shares the ['users']
// key prefix so account mutations that invalidate ['users'] also refresh
// these totals (e.g. cancelling an account moves it into the Cancelled tile).
export function useUserStats() {
  return useQuery({
    queryKey: ['users', 'stats'],
    queryFn: () => api<UserStats>('/api/users/stats'),
    staleTime: 30_000,
  });
}
