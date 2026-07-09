import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { PurchaseListResult } from '@/lib/types';

export function usePurchases(id: string, page: number, pageSize = 10) {
  return useQuery({
    queryKey: ['purchases', id, page, pageSize],
    queryFn: () =>
      api<PurchaseListResult>(`/api/users/${id}/purchases?page=${page}&pageSize=${pageSize}`),
    placeholderData: keepPreviousData,
  });
}
