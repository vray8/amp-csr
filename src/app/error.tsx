'use client';

import { useEffect } from 'react';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from 'next/link';

// Route-level error boundary (AMP-11): catches render/data errors below the
// root layout and offers a reset instead of a blank screen. `reset()`
// re-renders the segment; the "Back to Users" escape hatch covers errors
// that reset alone can't recover from.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error boundary:', error);
  }, [error]);

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1">
          Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary">
          An unexpected error occurred while loading this page. You can try again, or head back to
          the users list.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={reset}>
            Try again
          </Button>
          <Button component={Link} href="/users" variant="outlined">
            Back to Users
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
