'use client';

import { Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { userListQuerySchema, type UserListQuery } from '@/lib/schemas/user.schema';
import { useUsers, toQueryString } from '@/hooks/useUsers';
import { UserSearchBar } from '@/components/users/UserSearchBar';
import { UsersTable } from '@/components/users/UsersTable';

function parseParams(searchParams: URLSearchParams): UserListQuery {
  const result = userListQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (result.success) return result.data;
  // Fall back to schema defaults (page 1, pageSize 25, sort createdAt:desc)
  // when the URL has garbage in it (e.g. a hand-edited/stale query string).
  return userListQuerySchema.parse({});
}

function UsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useMemo(() => parseParams(searchParams), [searchParams]);

  const { data, isFetching, isError, error, refetch } = useUsers(params);

  const setUrl = useCallback(
    (patch: Partial<UserListQuery>) => {
      const next: UserListQuery = { ...params, ...patch };
      const qs = toQueryString(next);
      router.replace(qs ? `/users?${qs}` : '/users', { scroll: false });
    },
    [params, router],
  );

  const handleSearchChange = useCallback(
    (search: string) => {
      setUrl({ search: search || undefined, page: 1 });
    },
    [setUrl],
  );

  const handleStatusChange = useCallback(
    (status: UserListQuery['status']) => {
      setUrl({ status, page: 1 });
    },
    [setUrl],
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          Users
        </Typography>
        <UserSearchBar
          search={params.search ?? ''}
          status={params.status}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
        />
        <UsersTable
          data={data}
          params={params}
          isFetching={isFetching}
          isError={isError}
          error={error}
          onRetry={refetch}
          onParamsChange={setUrl}
        />
      </Stack>
    </Container>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageContent />
    </Suspense>
  );
}
