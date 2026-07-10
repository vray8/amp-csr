'use client';

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';

export default function UserNotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1">
          User not found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          We couldn&apos;t find a user with that id. It may have been removed, or the link may be
          incorrect.
        </Typography>
        <Button component={Link} href="/users" variant="contained">
          Back to Users
        </Button>
      </Stack>
    </Container>
  );
}
