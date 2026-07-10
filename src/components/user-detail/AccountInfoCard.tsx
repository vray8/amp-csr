'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { EditAccountDialog } from './EditAccountDialog';
import type { UserDetail } from '@/lib/types';

export interface AccountInfoCardProps {
  user: UserDetail;
}

function formatPaymentMethod(user: UserDetail): string {
  if (!user.paymentMethodBrand || !user.paymentMethodLast4) return 'None on file';
  return `${user.paymentMethodBrand} ····${user.paymentMethodLast4}`;
}

export function AccountInfoCard({ user }: AccountInfoCardProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Account Info"
        action={
          <Button size="small" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        }
      />
      <CardContent>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
              Name
            </Typography>
            <Typography variant="body2">{user.name}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
              Email
            </Typography>
            <Typography variant="body2">{user.email}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
              Phone
            </Typography>
            <Typography variant="body2">{user.phone}</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 120 }}>
              Payment method
            </Typography>
            <Typography variant="body2">{formatPaymentMethod(user)}</Typography>
          </Stack>
        </Stack>
      </CardContent>

      <EditAccountDialog open={editOpen} user={user} onClose={() => setEditOpen(false)} />
    </Card>
  );
}
