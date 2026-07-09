import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PlanSummary } from '@/lib/types';

// Plans are effectively static reference data (seeded, not edited through
// this portal), so this never goes stale for the life of the tab.
export function usePlans() {
  return useQuery({
    queryKey: ['plans'],
    queryFn: () => api<PlanSummary[]>('/api/plans'),
    staleTime: Infinity,
  });
}
