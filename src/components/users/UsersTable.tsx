'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef, GridPaginationModel, GridRowParams, GridSortModel } from '@mui/x-data-grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { StatusChip } from '@/components/common/StatusChip';
import type { UserListQuery } from '@/lib/schemas/user.schema';
import type { UserListItem, UserListResult } from '@/lib/types';
import type { ApiError } from '@/lib/api-client';

const SORTABLE_FIELDS = new Set(['name', 'createdAt']);

export interface UsersTableProps {
  data: UserListResult | undefined;
  params: UserListQuery;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onParamsChange: (patch: Partial<UserListQuery>) => void;
}

export function UsersTable({
  data,
  params,
  isFetching,
  isError,
  error,
  onRetry,
  onParamsChange,
}: UsersTableProps) {
  const router = useRouter();

  const columns: GridColDef<UserListItem>[] = useMemo(
    () => [
      // Fixed widths (not `flex`): MUI X collapses `flex` columns to 0 when the
      // grid measures a 0px container width on its first hydration paint and
      // never recomputes. Fixed widths are independent of that measurement.
      { field: 'name', headerName: 'Name', width: 200 },
      { field: 'email', headerName: 'Email', width: 260 },
      { field: 'phone', headerName: 'Phone', width: 180, sortable: false },
      {
        // Subscription status (not account status) — the user's current
        // subscription. Sorting is unavailable because it lives on a related
        // record, so this column is not server-sortable.
        field: 'subscriptionStatus',
        headerName: 'Subscription',
        width: 140,
        sortable: false,
        renderCell: (p) =>
          p.row.subscriptionStatus ? <StatusChip status={p.row.subscriptionStatus} /> : '—',
      },
      {
        field: 'createdAt',
        headerName: 'Joined',
        width: 130,
        valueFormatter: (value: string) => new Date(value).toLocaleDateString(),
      },
    ],
    [],
  );

  const [sortField, sortDirection] = params.sort.split(':') as ['name' | 'createdAt' | 'status', 'asc' | 'desc'];
  const sortModel: GridSortModel = SORTABLE_FIELDS.has(sortField)
    ? [{ field: sortField, sort: sortDirection }]
    : [];

  const paginationModel: GridPaginationModel = {
    page: params.page - 1,
    pageSize: params.pageSize,
  };

  const handlePaginationModelChange = (model: GridPaginationModel) => {
    onParamsChange({ page: model.page + 1, pageSize: model.pageSize });
  };

  const handleSortModelChange = (model: GridSortModel) => {
    const next = model[0];
    onParamsChange({
      sort: next ? (`${next.field}:${next.sort}` as UserListQuery['sort']) : undefined,
    });
  };

  const handleRowClick = (p: GridRowParams<UserListItem>) => {
    router.push(`/users/${p.id}`);
  };

  if (isError) {
    const apiError = error as ApiError | undefined;
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry}>
            Retry
          </Button>
        }
      >
        {apiError?.message ?? 'Failed to load users.'}
      </Alert>
    );
  }

  // A parent with a DEFINITE height/width is required by MUI X DataGrid.
  // Using `autoHeight` inside a flex column layout makes the grid measure a
  // 0px width on first paint and permanently collapse its `flex` columns
  // (Name/Email/Phone), so we give the grid a real height instead and let it
  // manage its own vertical scroll.
  return (
    <Box sx={{ width: '100%', height: 'calc(100vh - 260px)', minHeight: 420 }}>
      <DataGrid
        rows={data?.items ?? []}
        columns={columns}
        rowCount={data?.total ?? 0}
        loading={isFetching}
        paginationMode="server"
        sortingMode="server"
        paginationModel={paginationModel}
        onPaginationModelChange={handlePaginationModelChange}
        sortModel={sortModel}
        onSortModelChange={handleSortModelChange}
        onRowClick={handleRowClick}
        pageSizeOptions={[10, 25, 50]}
        disableColumnFilter
        disableRowSelectionOnClick
        // The grid measures a 0px width on its first hydration paint (inside the
        // Suspense boundary), and column virtualization then renders only the
        // columns it thinks fit in that 0px viewport and never recovers. With
        // just 6 columns and a small page, virtualization buys nothing — turning
        // it off makes every column render regardless of the mount-time measure.
        disableVirtualization
        sx={{ '& .MuiDataGrid-row': { cursor: 'pointer' } }}
      />
    </Box>
  );
}
