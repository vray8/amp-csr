import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';

// Single mapping table for every status-like enum in the app (account
// status + payment status), so AMP-7/8 (user detail, subscriptions,
// purchases) can reuse this instead of re-deriving color/label logic.
const STATUS_COLOR: Record<string, ChipProps['color']> = {
  ACTIVE: 'success',
  OVERDUE: 'warning',
  CANCELLED: 'default',
  PAUSED: 'info',
  PAID: 'success',
  FAILED: 'error',
  REFUNDED: 'default',
};

export interface StatusChipProps {
  status: string;
}

export function StatusChip({ status }: StatusChipProps) {
  const color = STATUS_COLOR[status] ?? 'default';
  return <Chip size="small" color={color} label={status} />;
}
