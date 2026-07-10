'use client';

import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import type { SelectChangeEvent } from '@mui/material/Select';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { UserListQuery } from '@/lib/schemas/user.schema';

type Status = NonNullable<UserListQuery['status']>;

const STATUS_OPTIONS: Array<{ value: Status | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export interface UserSearchBarProps {
  search: string;
  status: Status | undefined;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: Status | undefined) => void;
}

export function UserSearchBar({ search, status, onSearchChange, onStatusChange }: UserSearchBarProps) {
  // Local state so typing feels instant; only the debounced value is
  // pushed into the URL (and from there, into the API query key).
  const [inputValue, setInputValue] = useState(search);
  const debouncedValue = useDebouncedValue(inputValue, 300);

  // Keep local input in sync when the URL changes from elsewhere (e.g.
  // back/forward navigation, or a shared link). Adjusted during render
  // (React's recommended pattern) rather than in an effect, to avoid an
  // extra cascading render.
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setInputValue(search);
  }

  useEffect(() => {
    if (debouncedValue !== search) {
      onSearchChange(debouncedValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  const handleStatusSelect = (event: SelectChangeEvent) => {
    const value = event.target.value;
    onStatusChange(value === 'ALL' ? undefined : (value as Status));
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
      <TextField
        label="Search"
        placeholder="Name, email, phone, or license plate"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        size="small"
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          },
        }}
      />
      <FormControl size="small" sx={{ minWidth: 170 }}>
        <InputLabel id="status-filter-label">Account status</InputLabel>
        <Select
          labelId="status-filter-label"
          label="Account status"
          value={status ?? 'ALL'}
          onChange={handleStatusSelect}
        >
          {STATUS_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}
