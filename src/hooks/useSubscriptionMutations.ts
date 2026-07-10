import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateSubscriptionInput } from '@/lib/schemas/subscription.schema';
import type { SubscriptionDetail } from '@/lib/types';

// Same mutation+invalidate convention as useUpdateUser/useCancelAccount:
// userId is bound to the hook (for invalidation), entity ids/bodies are
// passed to mutate/mutateAsync. All three affect account status
// (ACTIVE/OVERDUE derives from subscriptions), so all invalidate ['users']
// too, not just ['user', userId].
export function useCreateSubscription(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSubscriptionInput) =>
      api<SubscriptionDetail>(`/api/users/${userId}/subscriptions`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useCancelSubscription(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      api<SubscriptionDetail>(`/api/subscriptions/${subscriptionId}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function usePayOverdueSubscription(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) =>
      api<SubscriptionDetail>(`/api/subscriptions/${subscriptionId}/pay`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useTransferSubscription(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriptionId, toVehicleId }: { subscriptionId: string; toVehicleId: string }) =>
      api<SubscriptionDetail>(`/api/subscriptions/${subscriptionId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({ toVehicleId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
