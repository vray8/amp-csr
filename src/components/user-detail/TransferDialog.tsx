'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import Alert from '@mui/material/Alert';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useTransferSubscription } from '@/hooks/useSubscriptionMutations';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import type { SubscriptionDetail, UserDetail } from '@/lib/types';

export interface TransferDialogProps {
  open: boolean;
  user: UserDetail;
  subscription: SubscriptionDetail;
  subscribedVehicleIds: Set<string>;
  onClose: () => void;
}

// The flagship "I bought a new car, move my membership" flow. Client-side
// eligibility (subscribedVehicleIds) is UX only — the server re-validates,
// so a 409 here (e.g. a race with another CSR tab) is expected and must be
// shown inline without closing the dialog.
export function TransferDialog({ open, user, subscription, subscribedVehicleIds, onClose }: TransferDialogProps) {
  const { showSnackbar } = useSnackbar();
  const transferSubscription = useTransferSubscription(user.id);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const otherVehicles = user.vehicles.filter((v) => v.id !== subscription.vehicleId);

  const reset = () => {
    setSelectedVehicleId(null);
    setApiError(null);
  };

  const handleClose = () => {
    if (transferSubscription.isPending) return;
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedVehicleId) return;
    setApiError(null);
    const toVehicle = otherVehicles.find((v) => v.id === selectedVehicleId);
    try {
      await transferSubscription.mutateAsync({ subscriptionId: subscription.id, toVehicleId: selectedVehicleId });
      showSnackbar(`Subscription transferred to ${toVehicle?.licensePlate ?? 'new vehicle'}`, 'success');
      reset();
      onClose();
    } catch (e) {
      if (e instanceof ApiError) {
        setApiError(e.message);
      } else {
        showSnackbar(e instanceof Error ? e.message : 'Transfer failed', 'error');
      }
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Transfer subscription</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {apiError && <Alert severity="error">{apiError}</Alert>}

          <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">
              Current vehicle
            </Typography>
            <Typography variant="body2">
              {subscription.vehicle.year} {subscription.vehicle.make} {subscription.vehicle.model} ·{' '}
              {subscription.vehicle.licensePlate}
            </Typography>
          </Stack>

          <FormControl fullWidth disabled={otherVehicles.length === 0}>
            <InputLabel id="transfer-vehicle-label">Transfer to</InputLabel>
            <Select
              labelId="transfer-vehicle-label"
              label="Transfer to"
              value={selectedVehicleId ?? ''}
              onChange={(e: SelectChangeEvent) => setSelectedVehicleId(e.target.value || null)}
            >
              {otherVehicles.map((v) => {
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

          {otherVehicles.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              This user has no other vehicles to transfer to.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={transferSubscription.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedVehicleId || transferSubscription.isPending}
        >
          Transfer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
