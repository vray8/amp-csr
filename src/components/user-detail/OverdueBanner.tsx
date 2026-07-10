import Alert from '@mui/material/Alert';
import { formatDate } from '@/lib/format';
import type { UserDetail } from '@/lib/types';

export interface OverdueBannerProps {
  user: UserDetail;
}

// Answers the "I can't get a wash" call: the detail payload carries the
// latest FAILED purchase (see `detailInclude` in user.repository.ts), so
// this renders without waiting on the separate purchases query.
export function OverdueBanner({ user }: OverdueBannerProps) {
  if (user.status !== 'OVERDUE') return null;

  const failed = user.purchases[0];
  if (!failed) return null;

  return (
    <Alert severity="warning" variant="filled">
      Account overdue — payment failed on {formatDate(failed.createdAt)}
      {failed.failureReason ? `: ${failed.failureReason}` : ''}
    </Alert>
  );
}
