'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import MenuIcon from '@mui/icons-material/Menu';
import LocalCarWashIcon from '@mui/icons-material/LocalCarWash';
import GroupIcon from '@mui/icons-material/Group';
import { SIDEBAR } from '@/theme';

const DRAWER_WIDTH = 244;

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isActive: (pathname: string) => boolean;
}

function Brand() {
  return (
    <Box
      component={Link}
      href="/users"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2.5,
        height: 64,
        color: SIDEBAR.text,
        textDecoration: 'none',
        borderBottom: `1px solid ${SIDEBAR.border}`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: 2,
          bgcolor: SIDEBAR.accent,
          color: '#fff',
        }}
      >
        <LocalCarWashIcon fontSize="small" />
      </Box>
      <Box sx={{ lineHeight: 1.1 }}>
        <Typography component="div" sx={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
          AMP
        </Typography>
        <Typography component="div" sx={{ color: SIDEBAR.textMuted, fontSize: '0.72rem' }}>
          CSR Portal
        </Typography>
      </Box>
    </Box>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  const items: NavItem[] = [
    {
      label: 'Users',
      href: '/users',
      icon: <GroupIcon fontSize="small" />,
      isActive: (p) => p === '/users' || p.startsWith('/users/'),
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: SIDEBAR.bg }}>
      <Brand />
      <Typography
        sx={{
          px: 2.5,
          pt: 2.5,
          pb: 1,
          color: SIDEBAR.textMuted,
          fontSize: '0.68rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        Workspace
      </Typography>
      <Stack spacing={0.5} sx={{ px: 1.5, flexGrow: 1 }}>
        {items.map((item) => {
          const active = item.isActive(pathname);
          return (
            <Box
              key={item.label}
              component={Link}
              href={item.href}
              onClick={onNavigate}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: active ? 600 : 500,
                color: active ? '#fff' : SIDEBAR.text,
                bgcolor: active ? SIDEBAR.bgActive : 'transparent',
                transition: 'background-color 120ms',
                '&:hover': { bgcolor: active ? SIDEBAR.bgActive : SIDEBAR.bgHover },
              }}
            >
              <Box sx={{ display: 'flex', color: active ? SIDEBAR.accent : SIDEBAR.textMuted }}>
                {item.icon}
              </Box>
              <span style={{ flexGrow: 1 }}>{item.label}</span>
            </Box>
          );
        })}
      </Stack>
      <Box sx={{ p: 2, borderTop: `1px solid ${SIDEBAR.border}` }}>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: SIDEBAR.accent, fontSize: '0.85rem' }}>
            CS
          </Avatar>
          <Box sx={{ lineHeight: 1.2 }}>
            <Typography sx={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>
              CSR Agent
            </Typography>
            <Typography sx={{ color: SIDEBAR.textMuted, fontSize: '0.72rem' }}>
              Support console
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      {/* Mobile top bar (hidden on md+ where the permanent rail is visible) */}
      <AppBar position="fixed" sx={{ display: { md: 'none' }, zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1 }}
          >
            <MenuIcon />
          </IconButton>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <LocalCarWashIcon fontSize="small" />
            <Typography sx={{ fontWeight: 700 }}>AMP CSR Portal</Typography>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobile}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: 'none' },
          }}
        >
          <SidebarContent onNavigate={closeMobile} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              borderRight: `1px solid ${SIDEBAR.border}`,
            },
          }}
        >
          <SidebarContent />
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Spacer under the fixed mobile AppBar; no-op on md+ */}
        <Toolbar sx={{ display: { md: 'none' } }} />
        {children}
      </Box>
    </Box>
  );
}
