import { z } from "zod";
import {
  AvailableAppointmentStatus
} from "../../utils/constants.js";

export const adminPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const adminAppointmentsQuerySchema = adminPaginationQuerySchema.extend({
  status: z.enum(AvailableAppointmentStatus).optional()
});
