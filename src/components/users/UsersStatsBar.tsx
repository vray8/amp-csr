'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import { alpha } from '@mui/material/styles';
import { useUserStats } from '@/hooks/useUserStats';
import { useHydrated } from '@/hooks/useHydrated';
import type { UserStats } from '@/lib/types';
import type { UserListQuery } from '@/lib/schemas/user.schema';

type Status = NonNullable<UserListQuery['status']>;

interface Tile {
  key: 'ALL' | Status;
  label: string;
  statKey: keyof UserStats;
  color: string;
  icon: React.ReactNode;
}

const TILES: Tile[] = [
  { key: 'ALL', label: 'Total', statKey: 'total', color: '#8079D9', icon: <GroupIcon /> },
  { key: 'ACTIVE', label: 'Active', statKey: 'active', color: '#1B873F', icon: <CheckCircleIcon /> },
  { key: 'OVERDUE', label: 'Overdue', statKey: 'overdue', color: '#B26A00', icon: <WarningAmberIcon /> },
  { key: 'CANCELLED', label: 'Cancelled', statKey: 'cancelled', color: '#6B7280', icon: <CancelIcon /> },
];

export interface UsersStatsBarProps {
  status: Status | undefined;
  onStatusChange: (status: Status | undefined) => void;
}

// Dashboard summary strip for the users list. Each tile is a live filter:
// clicking "Overdue" jumps the list to the accounts that can't get a wash,
// and the active tile is highlighted so the current filter is obvious.
export function UsersStatsBar({ status, onStatusChange }: UsersStatsBarProps) {
  const { data: stats, isPending } = useUserStats();

  // The QueryClient persists in memory on the client, so at hydration it may
  // already hold cached stats while the server (fresh client) rendered the
  // skeleton — a mismatch. Defer the real numbers until hydrated so the first
  // client render always matches the server.
  const hydrated = useHydrated();
  const showValue = hydrated && !isPending && !!stats;

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
      }}
    >
      {TILES.map((tile) => {
        const selected = (tile.key === 'ALL' && !status) || tile.key === status;
        const handleClick = () => onStatusChange(tile.key === 'ALL' ? undefined : tile.key);

        return (
          <Card
            key={tile.key}
            sx={{
              borderColor: selected ? tile.color : undefined,
              borderWidth: selected ? 2 : 1,
              boxShadow: selected ? `0 0 0 1px ${tile.color}` : undefined,
            }}
          >
            <CardActionArea onClick={handleClick} sx={{ p: 1.75, height: '100%' }}>
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    flexShrink: 0,
                    bgcolor: alpha(tile.color, 0.12),
                    color: tile.color,
                  }}
                >
                  {tile.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {tile.label}
                  </Typography>
                  {showValue ? (
                    <Typography variant="h5" component="div" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                      {stats[tile.statKey]}
                    </Typography>
                  ) : (
                    <Skeleton width={36} height={30} />
                  )}
                </Box>
              </Stack>
            </CardActionArea>
          </Card>
        );
      })}
    </Box>
  );
}
