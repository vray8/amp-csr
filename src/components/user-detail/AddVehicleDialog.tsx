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
import { createVehicleSchema, type CreateVehicleInput } from '@/lib/schemas/vehicle.schema';
import { useAddVehicle } from '@/hooks/useVehicleMutations';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';

export interface AddVehicleDialogProps {
  open: boolean;
  userId: string;
  onClose: () => void;
}

const EMPTY_DEFAULTS: CreateVehicleInput = {
  make: '',
  model: '',
  // z.coerce.number reads '' as 0, which is fine as a starting point for an
  // uncontrolled number field; the user overwrites it before submit.
  year: new Date().getFullYear(),
  color: '',
  licensePlate: '',
};

export function AddVehicleDialog({ open, userId, onClose }: AddVehicleDialogProps) {
  const { showSnackbar } = useSnackbar();
  const addVehicle = useAddVehicle(userId);

  const form = useForm<CreateVehicleInput>({
    // z.coerce.number() gives the schema an `unknown` input type for `year`,
    // which zodResolver's inferred generics don't reconcile with the
    // (number) output type useForm is declared with here — cast through
    // Resolver<CreateVehicleInput>, same schema the route handler parses.
    resolver: zodResolver(createVehicleSchema) as Resolver<CreateVehicleInput>,
    defaultValues: EMPTY_DEFAULTS,
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await addVehicle.mutateAsync(data);
      showSnackbar('Vehicle added', 'success');
      form.reset(EMPTY_DEFAULTS);
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) {
        for (const [field, message] of Object.entries(e.fieldErrors)) {
          form.setError(field as keyof CreateVehicleInput, { message });
        }
      } else {
        showSnackbar(e instanceof Error ? e.message : 'Failed to add vehicle', 'error');
      }
    }
  });

  const handleClose = () => {
    if (addVehicle.isPending) return;
    form.reset(EMPTY_DEFAULTS);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add vehicle</DialogTitle>
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
          <Button onClick={handleClose} disabled={addVehicle.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={addVehicle.isPending}>
            Add
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
