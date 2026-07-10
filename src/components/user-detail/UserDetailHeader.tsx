'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { StatusChip } from '@/components/common/StatusChip';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useCancelAccount } from '@/hooks/useCancelAccount';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import type { UserDetail } from '@/lib/types';

export interface UserDetailHeaderProps {
  user: UserDetail;
}

export function UserDetailHeader({ user }: UserDetailHeaderProps) {
  const { showSnackbar } = useSnackbar();
  const cancelAccount = useCancelAccount(user.id);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmError, setConfirmError] = useState<string | undefined>();

  const expectedPhrase = `cancel ${user.name}'s account`;
  const isCancelled = user.status === 'CANCELLED';

  const openDialog = () => {
    setConfirmText('');
    setConfirmError(undefined);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (cancelAccount.isPending) return;
    setDialogOpen(false);
  };

  const handleConfirm = async () => {
    if (confirmText.trim().toLowerCase() !== expectedPhrase.toLowerCase()) {
      setConfirmError(`Type "${expectedPhrase}" exactly to confirm.`);
      return;
    }
    try {
      await cancelAccount.mutateAsync();
      showSnackbar('Account cancelled', 'success');
      setDialogOpen(false);
    } catch (e) {
      showSnackbar(e instanceof ApiError ? e.message : 'Failed to cancel account', 'error');
    }
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Stack spacing={1}>
            <Typography variant="h4" component="h1">
              {user.name}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.email} · {user.phone}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <StatusChip status={user.status} />
              <Typography variant="body2" color="text.secondary">
                Member since {formatDate(user.createdAt)}
              </Typography>
            </Stack>
          </Stack>
          {!isCancelled && (
            <Button color="error" variant="outlined" onClick={openDialog}>
              Cancel Account
            </Button>
          )}
        </Stack>
      </CardContent>

      <ConfirmDialog
        open={dialogOpen}
        title="Cancel account"
        confirmLabel="Cancel account"
        danger
        loading={cancelAccount.isPending}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        body={
          <Stack spacing={2}>
            <Typography>
              This cancels all active subscriptions for {user.name}. This cannot be undone. Type{' '}
              <strong>{expectedPhrase}</strong> to confirm.
            </Typography>
            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Confirmation"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                if (confirmError) setConfirmError(undefined);
              }}
              error={!!confirmError}
              helperText={confirmError}
            />
          </Stack>
        }
      />
    </Card>
  );
}
