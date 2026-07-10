'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AddVehicleDialog } from '@/components/user-detail/AddVehicleDialog';
import { EditVehicleDialog } from '@/components/user-detail/EditVehicleDialog';
import { useRemoveVehicle } from '@/hooks/useVehicleMutations';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import type { UserDetail, VehicleSummary } from '@/lib/types';

export interface VehiclesSectionProps {
  user: UserDetail;
}

export function VehiclesSection({ user }: VehiclesSectionProps) {
  const { showSnackbar } = useSnackbar();
  const removeVehicle = useRemoveVehicle(user.id);

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<VehicleSummary | null>(null);
  const [removing, setRemoving] = useState<VehicleSummary | null>(null);

  const isCancelled = user.status === 'CANCELLED';

  const closeRemoveDialog = () => {
    if (removeVehicle.isPending) return;
    setRemoving(null);
  };

  const handleRemoveConfirm = async () => {
    if (!removing) return;
    try {
      await removeVehicle.mutateAsync(removing.id);
      showSnackbar('Vehicle removed', 'success');
      setRemoving(null);
    } catch (e) {
      // 409 (has subscription / transfer history) is an expected, recoverable
      // outcome here — surface the server's message, don't crash the dialog.
      showSnackbar(e instanceof ApiError ? e.message : 'Failed to remove vehicle', 'error');
    }
  };

  return (
    <Card>
      <CardHeader
        title="Vehicles"
        action={
          <Tooltip title={isCancelled ? 'Account is cancelled' : ''}>
            <span>
              <Button size="small" disabled={isCancelled} onClick={() => setAddOpen(true)}>
                Add vehicle
              </Button>
            </span>
          </Tooltip>
        }
      />
      <CardContent>
        {user.vehicles.length === 0 ? (
          <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="body2" color="text.secondary">
              No vehicles on file
            </Typography>
            <Button size="small" variant="outlined" disabled={isCancelled} onClick={() => setAddOpen(true)}>
              Add vehicle
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1.5} divider={<Divider />}>
            {user.vehicles.map((v) => (
              <Stack
                key={v.id}
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <Stack>
                  <Typography variant="body2">
                    {v.year} {v.make} {v.model} · {v.color}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {v.licensePlate}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={() => setEditing(v)}>
                    Edit
                  </Button>
                  <Button size="small" color="error" onClick={() => setRemoving(v)}>
                    Remove
                  </Button>
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>

      <AddVehicleDialog open={addOpen} userId={user.id} onClose={() => setAddOpen(false)} />

      {editing && (
        <EditVehicleDialog open userId={user.id} vehicle={editing} onClose={() => setEditing(null)} />
      )}

      <ConfirmDialog
        open={!!removing}
        title="Remove vehicle"
        confirmLabel="Remove"
        danger
        loading={removeVehicle.isPending}
        onClose={closeRemoveDialog}
        onConfirm={handleRemoveConfirm}
        body={
          removing ? (
            <Typography>
              Remove {removing.year} {removing.make} {removing.model} · {removing.licensePlate}? This cannot be
              undone.
            </Typography>
          ) : (
            ''
          )
        }
      />
    </Card>
  );
}
