import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { UserDetail } from '@/lib/types';

export function useCancelAccount(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<UserDetail>(`/api/users/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
