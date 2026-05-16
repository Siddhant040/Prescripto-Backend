import { z } from "zod";
// import { AvailableAppointmentStatus } from "../../utils/constants.js";

// helper to validate Mongo ObjectId
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

export const createAppointmentSchema = z.object({
  doctorId: objectId,

  appointmentDateTime: z.coerce.date().refine(
    (date) => date > new Date(),
    {
      message: "Appointment must be in the future"
    }
  )
});

export const rescheduleAppointmentSchema = z.object({
  appointmentDateTime: z.coerce.date().refine(
    (date) => date > new Date(),
    {
      message: "Appointment must be in the future"
    }
  )
});
