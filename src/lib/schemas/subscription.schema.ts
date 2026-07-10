import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  vehicleId: z.string().min(1),
  planId: z.string().min(1),
});
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const transferSubscriptionSchema = z.object({
  toVehicleId: z.string().min(1),
});
export type TransferSubscriptionInput = z.infer<typeof transferSubscriptionSchema>;

// Client-side only: the "pay overdue balance" form validates card details for
// a realistic CSR flow, but they are never sent to the server or stored — the
// reactivate endpoint takes no body and just flips the subscription to ACTIVE
// (no real payment processing). Keep card data off the wire.
export const payOverdueSchema = z.object({
  cardName: z.string().trim().min(1, 'Name on card is required'),
  cardNumber: z
    .string()
    .refine((s) => /^\d{13,19}$/.test(s.replace(/[\s-]/g, '')), 'Enter a valid card number'),
  expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'Use MM/YY'),
  cvc: z.string().regex(/^\d{3,4}$/, 'Enter a valid CVC'),
});
export type PayOverdueInput = z.infer<typeof payOverdueSchema>;
