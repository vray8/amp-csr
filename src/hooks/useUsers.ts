import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserListQuery } from '@/lib/schemas/user.schema';
import type { UserListResult } from '@/lib/types';

// Builds a query string from a parsed UserListQuery, omitting
// undefined/empty values so the URL/API request stays minimal (and so
// `search=''` doesn't get sent as a literal empty filter).
export function toQueryString(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    usp.set(key, String(value));
  }
  return usp.toString();
}

export function useUsers(params: UserListQuery) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => api<UserListResult>(`/api/users?${toQueryString(params)}`),
    placeholderData: keepPreviousData,
  });
}
