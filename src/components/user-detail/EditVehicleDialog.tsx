'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { updateVehicleSchema, type UpdateVehicleInput } from '@/lib/schemas/vehicle.schema';
import { useUpdateVehicle } from '@/hooks/useVehicleMutations';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import type { VehicleSummary } from '@/lib/types';

export interface EditVehicleDialogProps {
  open: boolean;
  userId: string;
  vehicle: VehicleSummary;
  onClose: () => void;
}

export function EditVehicleDialog({ open, userId, vehicle, onClose }: EditVehicleDialogProps) {
  const { showSnackbar } = useSnackbar();
  const updateVehicle = useUpdateVehicle(userId);

  const form = useForm<UpdateVehicleInput>({
    // Same z.coerce.number() cast as AddVehicleDialog — see comment there.
    resolver: zodResolver(updateVehicleSchema) as Resolver<UpdateVehicleInput>, // SAME schema the route handler parses
    values: {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      licensePlate: vehicle.licensePlate,
    }, // 'values' keeps dialog in sync if the underlying vehicle changes
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateVehicle.mutateAsync({ vehicleId: vehicle.id, data });
      showSnackbar('Vehicle updated', 'success');
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) {
        for (const [field, message] of Object.entries(e.fieldErrors)) {
          form.setError(field as keyof UpdateVehicleInput, { message });
        }
      } else {
        showSnackbar(e instanceof Error ? e.message : 'Failed to update vehicle', 'error');
      }
    }
  });

  const handleClose = () => {
    if (updateVehicle.isPending) return;
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit vehicle</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Make"
              fullWidth
              {...form.register('make')}
              error={!!form.formState.errors.make}
              helperText={form.formState.errors.make?.message}
            />
            <TextField
              label="Model"
              fullWidth
              {...form.register('model')}
              error={!!form.formState.errors.model}
              helperText={form.formState.errors.model?.message}
            />
            <TextField
              label="Year"
              type="number"
              fullWidth
              {...form.register('year')}
              error={!!form.formState.errors.year}
              helperText={form.formState.errors.year?.message}
            />
            <TextField
              label="Color"
              fullWidth
              {...form.register('color')}
              error={!!form.formState.errors.color}
              helperText={form.formState.errors.color?.message}
            />
            <TextField
              label="License plate"
              fullWidth
              {...form.register('licensePlate')}
              error={!!form.formState.errors.licensePlate}
              helperText={form.formState.errors.licensePlate?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={updateVehicle.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={updateVehicle.isPending}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
