import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { StatusChip } from '@/components/common/StatusChip';
import { formatMoney, formatDate } from '@/lib/format';
import type { SubscriptionDetail } from '@/lib/types';

export interface SubscriptionsSectionProps {
  subscriptions: SubscriptionDetail[];
}

// Read-only for AMP-7; AMP-8 adds pause/cancel/transfer actions here.
export function SubscriptionsSection({ subscriptions }: SubscriptionsSectionProps) {
  return (
    <Card>
      <CardHeader title="Subscriptions" />
      <CardContent>
        {subscriptions.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No subscriptions.
          </Typography>
        ) : (
          <Stack spacing={2} divider={<Divider />}>
            {subscriptions.map((sub) => (
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
                          {t.fromVehicle.licensePlate} → {t.toVehicle.licensePlate} on {formatDate(t.transferredAt)}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
