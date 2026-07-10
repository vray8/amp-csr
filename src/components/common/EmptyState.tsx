import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  // Optional call-to-action (e.g. an "Add" button) rendered under the text.
  action?: React.ReactNode;
}

// Consistent, centered empty state for the detail cards (subscriptions,
// vehicles, purchases) so "nothing here yet" reads as intentional rather than
// like a rendering glitch.
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 4, px: 2 }}>
      {icon && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 0.5 }}>{action}</Box>}
    </Stack>
  );
}
