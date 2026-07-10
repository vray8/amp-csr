'use client';

import { createTheme, alpha } from '@mui/material/styles';
// Makes the `MuiDataGrid` key valid in the `components` theme override below.
import type {} from '@mui/x-data-grid/themeAugmentation';

// Single source of truth for the app's look & feel ("Operator Console"
// direction): a dark slate side-rail with a light, data-dense workspace and a
// violet accent. Kept out of providers.tsx so palette / typography / component
// defaults are easy to find and tune.
//
// Fonts: Geist (sans) + Geist Mono are loaded in layout.tsx as CSS variables
// (`--font-geist-sans` / `--font-geist-mono`); MUI's typography points at
// those so the whole UI — including MUI components — uses Geist.
const fontFamily =
  'var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

// Soft violet accent (primary). Overdue deliberately stays amber and errors
// red so account status keeps its conventional semantic colors.
const ACCENT = '#8079D9';
const ACCENT_DARK = '#655DBE';

// Dark side-rail surfaces, exported so the sidebar/app-shell share exact values.
export const SIDEBAR = {
  bg: '#181C28',
  bgHover: '#232838',
  bgActive: '#2C2555',
  border: '#262B39',
  text: '#C4CAD6',
  textMuted: '#7A8299',
  accent: '#8B7FF0',
};

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    // contrastText pinned white so the softer/lighter primary keeps legible
    // button text (MUI would otherwise flip to dark text below its threshold).
    primary: { main: ACCENT, dark: ACCENT_DARK, contrastText: '#FFFFFF' },
    secondary: { main: '#3F4656' },
    success: { main: '#1B873F' },
    warning: { main: '#B26A00' },
    error: { main: '#C62828' },
    background: {
      // Cool grey workspace so the white cards and stat tiles lift off it.
      default: '#F5F6FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1F2B',
      secondary: '#5A6472',
    },
    divider: '#E5E7F0',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, letterSpacing: '-0.015em' },
    h4: { fontWeight: 700, letterSpacing: '-0.015em' },
    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: 'none' },
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        // Only the mobile top bar uses AppBar now; match the slate side-rail.
        root: {
          backgroundColor: SIDEBAR.bg,
          backgroundImage: 'none',
          borderBottom: `1px solid ${SIDEBAR.border}`,
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: '1px solid #E5E7F0',
          borderRadius: 12,
          boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { paddingBottom: 4 },
        title: { fontSize: '1.05rem', fontWeight: 600 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
        sizeSmall: { letterSpacing: '0.01em' },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: { borderRadius: 12 },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #E5E7F0',
          borderRadius: 12,
          backgroundColor: '#FFFFFF',
          '--DataGrid-containerBackground': '#F7F8FC',
        },
        columnHeaderTitle: { fontWeight: 600 },
        row: {
          '&:hover': { backgroundColor: alpha(ACCENT, 0.05) },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, color: '#5A6472' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.75rem' },
      },
    },
  },
});
