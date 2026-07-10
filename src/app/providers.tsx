'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { AlertColor } from '@mui/material/Alert';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { theme } from '@/theme';

interface SnackbarMessage {
  message: string;
  severity: AlertColor;
}

interface SnackbarContextValue {
  showSnackbar: (message: string, severity?: AlertColor) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within Providers');
  return ctx;
}

function SnackbarProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<SnackbarMessage | null>(null);
  const [open, setOpen] = useState(false);

  const showSnackbar = useCallback((message: string, severity: AlertColor = 'success') => {
    setCurrent({ message, severity });
    setOpen(true);
  }, []);

  const handleClose = useCallback((_event?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {current ? (
          <Alert onClose={handleClose} severity={current.severity} variant="filled" sx={{ width: '100%' }}>
            {current.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{children}</SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
