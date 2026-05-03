import { z } from "zod";

export const createDoctorSchema = z.object({
  specialization: z.string().trim().min(2),

  experience: z.coerce.number().min(0),

  consultationFee: z.coerce.number().min(0),

  bio: z.string().trim().max(500).optional()
});