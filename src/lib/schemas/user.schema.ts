import { z } from 'zod';
import { paginationSchema } from './common.schema';

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number').max(20),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'OVERDUE', 'CANCELLED']).optional(),
  sort: z
    .string()
    .regex(/^(name|createdAt|status):(asc|desc)$/)
    .default('createdAt:desc'),
});
export type UserListQuery = z.infer<typeof userListQuerySchema>;
