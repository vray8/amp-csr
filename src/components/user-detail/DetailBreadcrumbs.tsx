'use client';

import Link from 'next/link';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Skeleton from '@mui/material/Skeleton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export interface DetailBreadcrumbsProps {
  // The current user's name; omitted while the detail is still loading.
  name?: string;
}

// Back link + breadcrumb trail for the user detail page, giving a CSR a
// one-click route back to the list (the browser back button isn't obvious in
// an internal tool). Rendered in every page state so it's always available.
export function DetailBreadcrumbs({ name }: DetailBreadcrumbsProps) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}
    >
      <Button
        component={Link}
        href="/users"
        size="small"
        color="inherit"
        startIcon={<ArrowBackIcon />}
        sx={{ color: 'text.secondary' }}
      >
        Back to users
      </Button>
      <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb">
        <MuiLink component={Link} href="/users" underline="hover" color="text.secondary">
          Users
        </MuiLink>
        {name ? (
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {name}
          </Typography>
        ) : (
          <Skeleton width={120} />
        )}
      </Breadcrumbs>
    </Stack>
  );
}
