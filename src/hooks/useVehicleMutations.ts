import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { CreateVehicleInput, UpdateVehicleInput } from '@/lib/schemas/vehicle.schema';
import type { VehicleSummary } from '@/lib/types';

// Same mutation+invalidate convention as useUpdateUser/useCancelAccount:
// userId is bound to the hook (for invalidation), entity ids/bodies are
// passed to mutate/mutateAsync.
export function useAddVehicle(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateVehicleInput) =>
      api<VehicleSummary>(`/api/users/${userId}/vehicles`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateVehicle(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, data }: { vehicleId: string; data: UpdateVehicleInput }) =>
      api<VehicleSummary>(`/api/vehicles/${vehicleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useRemoveVehicle(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vehicleId: string) => api<{ id: string }>(`/api/vehicles/${vehicleId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
