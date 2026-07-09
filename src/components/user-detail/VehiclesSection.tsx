import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import type { VehicleSummary } from '@/lib/types';

export interface VehiclesSectionProps {
  vehicles: VehicleSummary[];
}

// Read-only for AMP-7; AMP-8 adds add/edit/remove actions here.
export function VehiclesSection({ vehicles }: VehiclesSectionProps) {
  return (
    <Card>
      <CardHeader title="Vehicles" />
      <CardContent>
        {vehicles.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No vehicles.
          </Typography>
        ) : (
          <Stack spacing={1.5} divider={<Divider />}>
            {vehicles.map((v) => (
              <Stack key={v.id} direction="row" sx={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Typography variant="body2">
                  {v.year} {v.make} {v.model} · {v.color}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {v.licensePlate}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
