'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import { updateUserSchema, type UpdateUserInput } from '@/lib/schemas/user.schema';
import { useUpdateUser } from '@/hooks/useUpdateUser';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import type { UserDetail } from '@/lib/types';

export interface EditAccountDialogProps {
  open: boolean;
  user: UserDetail;
  onClose: () => void;
}

export function EditAccountDialog({ open, user, onClose }: EditAccountDialogProps) {
  const { showSnackbar } = useSnackbar();
  const updateUser = useUpdateUser(user.id);

  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema), // SAME schema the route handler parses
    values: { name: user.name, email: user.email, phone: user.phone }, // 'values' keeps dialog in sync
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateUser.mutateAsync(data);
      showSnackbar('Account updated', 'success');
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.fieldErrors) {
        for (const [field, message] of Object.entries(e.fieldErrors)) {
          form.setError(field as keyof UpdateUserInput, { message });
        }
      } else {
        showSnackbar(e instanceof Error ? e.message : 'Update failed', 'error');
      }
    }
  });

  const handleClose = () => {
    if (updateUser.isPending) return;
    form.reset();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit account</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Name"
              fullWidth
              {...form.register('name')}
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
            />
            <TextField
              label="Email"
              fullWidth
              {...form.register('email')}
              error={!!form.formState.errors.email}
              helperText={form.formState.errors.email?.message}
            />
            <TextField
              label="Phone"
              fullWidth
              {...form.register('phone')}
              error={!!form.formState.errors.phone}
              helperText={form.formState.errors.phone?.message}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={updateUser.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={updateUser.isPending}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
