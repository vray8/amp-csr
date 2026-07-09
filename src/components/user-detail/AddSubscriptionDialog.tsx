'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useCreateSubscription } from '@/hooks/useSubscriptionMutations';
import { usePlans } from '@/hooks/usePlans';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { UserDetail } from '@/lib/types';

export interface AddSubscriptionDialogProps {
  open: boolean;
  user: UserDetail;
  subscribedVehicleIds: Set<string>;
  onClose: () => void;
}

export function AddSubscriptionDialog({ open, user, subscribedVehicleIds, onClose }: AddSubscriptionDialogProps) {
  const { showSnackbar } = useSnackbar();
  const createSubscription = useCreateSubscription(user.id);
  const { data: plans, isPending: plansPending } = usePlans();

  const [vehicleId, setVehicleId] = useState('');
  const [planId, setPlanId] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const reset = () => {
    setVehicleId('');
    setPlanId('');
    setApiError(null);
  };

  const handleClose = () => {
    if (createSubscription.isPending) return;
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!vehicleId || !planId) return;
    setApiError(null);
    try {
      await createSubscription.mutateAsync({ vehicleId, planId });
      showSnackbar('Subscription added', 'success');
      reset();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        setApiError(e.message);
      } else {
        showSnackbar(e instanceof Error ? e.message : 'Failed to add subscription', 'error');
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add subscription</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}

          <FormControl fullWidth>
            <InputLabel id="add-sub-vehicle-label">Vehicle</InputLabel>
            <Select
              labelId="add-sub-vehicle-label"
              label="Vehicle"
              value={vehicleId}
              onChange={(e: SelectChangeEvent) => setVehicleId(e.target.value)}
            >
              {user.vehicles.map((v) => {
                const disabled = subscribedVehicleIds.has(v.id);
                return (
                  <MenuItem key={v.id} value={v.id} disabled={disabled}>
                    <ListItemText
                      primary={`${v.year} ${v.make} ${v.model} · ${v.licensePlate}`}
                      secondary={disabled ? 'Already has a subscription' : undefined}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="add-sub-plan-label">Plan</InputLabel>
            <Select
              labelId="add-sub-plan-label"
              label="Plan"
              value={planId}
              disabled={plansPending}
              onChange={(e: SelectChangeEvent) => setPlanId(e.target.value)}
            >
              {(plans ?? []).map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name} — {formatMoney(p.priceCents)}/mo
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={createSubscription.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!vehicleId || !planId || createSubscription.isPending}
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
