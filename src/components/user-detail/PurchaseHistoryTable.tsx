'use client';

import { useState } from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { StatusChip } from '@/components/common/StatusChip';
import { EmptyState } from '@/components/common/EmptyState';
import { usePurchases } from '@/hooks/usePurchases';
import { formatMoney, formatDate } from '@/lib/format';
import type { ApiError } from '@/lib/api-client';

export interface PurchaseHistoryTableProps {
  userId: string;
}

// Deliberately a plain MUI <Table>, not the DataGrid: the users-list
// DataGrid measures a 0px width on first hydration paint inside a
// Suspense/client boundary and permanently collapses its flex/virtualized
// columns (see UsersTable.tsx). A plain table sidesteps that class of bug
// entirely for this simple, small paginated list.
export function PurchaseHistoryTable({ userId }: PurchaseHistoryTableProps) {
  const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
  const pageSize = 10;
  const { data, isFetching, isError, error, refetch } = usePurchases(userId, page + 1, pageSize);

  if (isError) {
    const apiError = error as ApiError | undefined;
    return (
      <Card>
        <CardHeader title="Purchase History" />
        <CardContent>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => refetch()}>
                Retry
              </Button>
            }
          >
            {apiError?.message ?? 'Failed to load purchase history.'}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const items = data?.items ?? [];
  // First load (no cached page yet): show skeleton rows instead of an empty
  // table flashing to "no purchases" before the data arrives.
  const isInitialLoading = isFetching && data === undefined;

  if (items.length === 0 && !isFetching) {
    return (
      <Card>
        <CardHeader title="Purchase History" />
        <CardContent>
          <EmptyState
            icon={<ReceiptLongIcon />}
            title="No purchases yet"
            description="This customer hasn't made any purchases."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Purchase History" />
      <CardContent>
        <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isInitialLoading &&
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j} align={j === 3 ? 'right' : 'left'}>
                            <Skeleton />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDate(p.createdAt)}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell>{p.type}</TableCell>
                      <TableCell align="right">{formatMoney(p.amountCents)}</TableCell>
                      <TableCell>
                        {p.status === 'FAILED' && p.failureReason ? (
                          <Tooltip title={p.failureReason}>
                            <span>
                              <StatusChip status={p.status} />
                            </span>
                          </Tooltip>
                        ) : (
                          <StatusChip status={p.status} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data?.total ?? 0}
              page={page}
              onPageChange={(_e, newPage) => setPage(newPage)}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[pageSize]}
            />
          </>
      </CardContent>
    </Card>
  );
}
