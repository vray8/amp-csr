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
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { payOverdueSchema, type PayOverdueInput } from '@/lib/schemas/subscription.schema';
import { usePayOverdueSubscription } from '@/hooks/useSubscriptionMutations';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import { formatMoney } from '@/lib/format';
import type { SubscriptionDetail, UserDetail } from '@/lib/types';

export interface PayOverdueDialogProps {
  open: boolean;
  user: UserDetail;
  subscription: SubscriptionDetail;
  onClose: () => void;
}

// Collects card details for a realistic "pay the overdue balance" CSR flow,
// but the details are validated client-side only and never sent to the server
// (the mutation posts no body). On success the subscription is brought back to
// ACTIVE. A 409 (e.g. the sub is no longer overdue after another CSR acted) is
// shown inline without closing the dialog.
export function PayOverdueDialog({ open, user, subscription, onClose }: PayOverdueDialogProps) {
  const { showSnackbar } = useSnackbar();
  const payOverdue = usePayOverdueSubscription(user.id);

  const form = useForm<PayOverdueInput>({
    resolver: zodResolver(payOverdueSchema),
    defaultValues: { cardName: '', cardNumber: '', expiry: '', cvc: '' },
  });

  const handleClose = () => {
    if (payOverdue.isPending) return;
    form.reset();
    onClose();
  };

  const onSubmit = form.handleSubmit(async () => {
    try {
      await payOverdue.mutateAsync(subscription.id);
      showSnackbar('Overdue balance paid — subscription reactivated', 'success');
      form.reset();
      onClose();
    } catch (e) {
      // Card details are never sent, so any error here is a server-side
      // state conflict — surface it inline rather than as a field error.
      form.setError('root', {
        message: e instanceof ApiError ? e.message : 'Payment failed',
      });
    }
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Pay overdue balance</DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            {form.formState.errors.root && (
              <Alert severity="error">{form.formState.errors.root.message}</Alert>
            )}

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                p: 1.5,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {subscription.plan.name} · {subscription.vehicle.licensePlate}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Amount due
                </Typography>
              </Box>
              <Typography variant="h6">{formatMoney(subscription.plan.priceCents)}</Typography>
            </Box>

            <TextField
              label="Name on card"
              fullWidth
              autoComplete="cc-name"
              {...form.register('cardName')}
              error={!!form.formState.errors.cardName}
              helperText={form.formState.errors.cardName?.message}
            />
            <TextField
              label="Card number"
              fullWidth
              placeholder="4242 4242 4242 4242"
              autoComplete="cc-number"
              inputMode="numeric"
              {...form.register('cardNumber')}
              error={!!form.formState.errors.cardNumber}
              helperText={form.formState.errors.cardNumber?.message}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Expiry (MM/YY)"
                fullWidth
                placeholder="08/28"
                autoComplete="cc-exp"
                {...form.register('expiry')}
                error={!!form.formState.errors.expiry}
                helperText={form.formState.errors.expiry?.message}
              />
              <TextField
                label="CVC"
                fullWidth
                placeholder="123"
                autoComplete="cc-csc"
                inputMode="numeric"
                {...form.register('cvc')}
                error={!!form.formState.errors.cvc}
                helperText={form.formState.errors.cvc?.message}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={payOverdue.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={payOverdue.isPending}>
            Pay {formatMoney(subscription.plan.priceCents)}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
