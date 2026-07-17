import {Router} from "express";
import {
    createAppointment,
    getAppointmentsForUser,
    getAppointmentsForDoctor,
    getAppointmentsById,
    rescheduleAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    getAvailableSlots,
    createPrescription
} from "./appointment.controller.js";

import {
  createAppointmentSchema,
  rescheduleAppointmentSchema
}  from "./appointment.validation.js";
import {validate} from "../../middleware/validate.middleware.js";
import {authMiddleware} from "../../middleware/auth.middleware.js";
import {authorizeRoles} from "../../middleware/role.middleware.js";

const router = Router();

router.get(
  "/slots",
  authMiddleware,
  authorizeRoles("patient", "doctor", "admin"),
  getAvailableSlots
);

router.post(
  "/",
  authMiddleware,
  authorizeRoles("patient"),
  validate(createAppointmentSchema),
  createAppointment
);

router.get(
  "/",
  authMiddleware,
  authorizeRoles("patient"),
  getAppointmentsForUser
);

router.get(
  "/doctor",
  authMiddleware,
  authorizeRoles("doctor"),
  getAppointmentsForDoctor
);

router.get(
  "/:id",
  authMiddleware,
  authorizeRoles("patient", "doctor", "admin"),
  getAppointmentsById
);

router.patch(
  "/:id/reschedule",
  authMiddleware,
  authorizeRoles("patient", "admin"),
  validate(rescheduleAppointmentSchema),
  rescheduleAppointment
);

router.patch(
  "/:id/status",
  authMiddleware,
  authorizeRoles("doctor"),
  updateAppointmentStatus
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  authorizeRoles("patient", "doctor", "admin"),
  cancelAppointment
);
router.patch(
  "/:id/prescription",
  authMiddleware,
  authorizeRoles("doctor"),
  createPrescription
);


export default router;
