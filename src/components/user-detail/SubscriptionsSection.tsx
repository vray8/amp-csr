'use client';

import { useMemo, useState } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CreditCardOffIcon from '@mui/icons-material/CreditCardOff';
import { StatusChip } from '@/components/common/StatusChip';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { AddSubscriptionDialog } from '@/components/user-detail/AddSubscriptionDialog';
import { TransferDialog } from '@/components/user-detail/TransferDialog';
import { useCancelSubscription } from '@/hooks/useSubscriptionMutations';
import { useSnackbar } from '@/app/providers';
import { ApiError } from '@/lib/api-client';
import { formatMoney, formatDate } from '@/lib/format';
import type { SubscriptionDetail, UserDetail } from '@/lib/types';

export interface SubscriptionsSectionProps {
  user: UserDetail;
}

export function SubscriptionsSection({ user }: SubscriptionsSectionProps) {
  const { showSnackbar } = useSnackbar();
  const cancelSubscription = useCancelSubscription(user.id);

  const [addOpen, setAddOpen] = useState(false);
  const [transferring, setTransferring] = useState<SubscriptionDetail | null>(null);
  const [cancelling, setCancelling] = useState<SubscriptionDetail | null>(null);

  const subscriptions = user.subscriptions;

  const subscribedVehicleIds = useMemo(
    () => new Set(subscriptions.filter((s) => s.status !== 'CANCELLED').map((s) => s.vehicleId)),
    [subscriptions],
  );

  const isCancelled = user.status === 'CANCELLED';
  const hasEligibleVehicle = user.vehicles.some((v) => !subscribedVehicleIds.has(v.id));
  const addDisabled = isCancelled || !hasEligibleVehicle;
  const addDisabledReason = isCancelled
    ? 'Account is cancelled'
    : !hasEligibleVehicle
      ? 'All vehicles already have a subscription'
      : '';

  const closeCancelDialog = () => {
    if (cancelSubscription.isPending) return;
    setCancelling(null);
  };

  const handleCancelConfirm = async () => {
    if (!cancelling) return;
    try {
      await cancelSubscription.mutateAsync(cancelling.id);
      showSnackbar('Subscription cancelled', 'success');
      setCancelling(null);
    } catch (e) {
      showSnackbar(e instanceof ApiError ? e.message : 'Failed to cancel subscription', 'error');
    }
  };

  return (
    <Card>
      <CardHeader
        title="Subscriptions"
        action={
          <Tooltip title={addDisabledReason}>
            <span>
              <Button size="small" disabled={addDisabled} onClick={() => setAddOpen(true)}>
                Add subscription
              </Button>
            </span>
          </Tooltip>
        }
      />
      <CardContent>
        {subscriptions.length === 0 ? (
          <EmptyState
            icon={<CreditCardOffIcon />}
            title="No subscriptions"
            description="This customer doesn't have any vehicle memberships yet."
            action={
              <Tooltip title={addDisabledReason}>
                <span>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={addDisabled}
                    onClick={() => setAddOpen(true)}
                  >
                    Add subscription
                  </Button>
                </span>
              </Tooltip>
            }
          />
        ) : (
          <Stack spacing={2} divider={<Divider />}>
            {subscriptions.map((sub) => {
              const isActionable = sub.status !== 'CANCELLED';
              return (
                <Box key={sub.id}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Typography variant="subtitle1">{sub.plan.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatMoney(sub.plan.priceCents)}/mo
                      </Typography>
                    </Stack>
                    <StatusChip status={sub.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {sub.vehicle.year} {sub.vehicle.make} {sub.vehicle.model} · {sub.vehicle.licensePlate}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {sub.cancelledAt
                      ? `Cancelled ${formatDate(sub.cancelledAt)}`
                      : sub.nextBillingDate
                        ? `Next billing ${formatDate(sub.nextBillingDate)}`
                        : `Started ${formatDate(sub.startedAt)}`}
                  </Typography>

                  {sub.transfers.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Transfer history
                      </Typography>
                      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                        {sub.transfers.map((t) => (
                          <Typography variant="body2" key={t.id}>
                            Transferred from {t.fromVehicle.licensePlate} to {t.toVehicle.licensePlate} on{' '}
                            {formatDate(t.transferredAt)}
                          </Typography>
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {isActionable && (
                    <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                      <Button size="small" onClick={() => setTransferring(sub)}>
                        Transfer
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={cancelSubscription.isPending && cancelling?.id === sub.id}
                        onClick={() => setCancelling(sub)}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  )}
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>

      <AddSubscriptionDialog
        open={addOpen}
        user={user}
        subscribedVehicleIds={subscribedVehicleIds}
        onClose={() => setAddOpen(false)}
      />

      {transferring && (
        <TransferDialog
          open
          user={user}
          subscription={transferring}
          subscribedVehicleIds={subscribedVehicleIds}
          onClose={() => setTransferring(null)}
        />
      )}

      <ConfirmDialog
        open={!!cancelling}
        title="Cancel subscription"
        confirmLabel="Cancel subscription"
        danger
        loading={cancelSubscription.isPending}
        onClose={closeCancelDialog}
        onConfirm={handleCancelConfirm}
        body={
          cancelling ? (
            <Typography>
              Cancel the {cancelling.plan.name} subscription for {cancelling.vehicle.year} {cancelling.vehicle.make}{' '}
              {cancelling.vehicle.model} · {cancelling.vehicle.licensePlate}? This cannot be undone.
            </Typography>
          ) : (
            ''
          )
        }
      />
    </Card>
  );
}
