import {Router} from "express";
import {
    createAppointment,
    getAppointmentsForUser,
    getAppointmentsForDoctor,
    getAppointmentsById,

    updateAppointmentStatus,
    cancelAppointment
} from "./appointment.controller.js";

import {createAppointmentSchema}  from "./appointment.validation.js";
import {validate} from "../../middleware/validate.middleware.js";
import {authMiddleware} from "../../middleware/auth.middleware.js";
import {authorizeRoles} from "../../middleware/role.middleware.js";

const router = Router();

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

export default router;