import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';
import type { UserDetail } from '@/lib/types';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api<UserDetail>(`/api/users/${id}`),
    // A 4xx (esp. a 404 for a bad/stale id) will never succeed on retry, so
    // don't retry it — surface the not-found page immediately instead of
    // sitting on skeletons through the default retry/backoff. Transient 5xx
    // still get one retry.
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
      return failureCount < 1;
    },
  });
}
