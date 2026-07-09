'use client';

import { useParams, notFound } from 'next/navigation';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useUser } from '@/hooks/useUser';
import { ApiError } from '@/lib/api-client';
import { OverdueBanner } from '@/components/user-detail/OverdueBanner';
import { UserDetailHeader } from '@/components/user-detail/UserDetailHeader';
import { AccountInfoCard } from '@/components/user-detail/AccountInfoCard';
import { SubscriptionsSection } from '@/components/user-detail/SubscriptionsSection';
import { VehiclesSection } from '@/components/user-detail/VehiclesSection';
import { PurchaseHistoryTable } from '@/components/user-detail/PurchaseHistoryTable';

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: user, isPending, isError, error, refetch } = useUser(id);

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    const apiError = error as ApiError | undefined;
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          {apiError?.message ?? 'Failed to load user.'}
        </Alert>
      </Container>
    );
  }

  if (isPending || !user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={3}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} />
          ))}
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <OverdueBanner user={user} />
        <UserDetailHeader user={user} />
        <AccountInfoCard user={user} />
        <SubscriptionsSection subscriptions={user.subscriptions} />
        <VehiclesSection vehicles={user.vehicles} />
        <PurchaseHistoryTable userId={user.id} />
      </Stack>
    </Container>
  );
}
