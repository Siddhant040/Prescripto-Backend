import { Router } from "express";
import {
  createDoctorProfile,
  deleteDoctorProfile,
  getAllDoctors,
  getDoctorById,
  getLoginDoctor,
  toggleDoctorAvailability,
  updateAvailability,
  updateDoctorProfile
} from "./doctor.controller.js";

import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { UserRoleEnum } from "../../utils/constants.js";
import { createDoctorSchema } from "./doctor.validation.js";

const router = Router();


router.patch(
  "/slot-availability",
  authMiddleware,
  authorizeRoles("doctor"),
  updateAvailability
);
router.get("/me", authMiddleware, getLoginDoctor);


//public routes
router.post(
  "/",
  authMiddleware,
  validate(createDoctorSchema),
  createDoctorProfile
);

router.get("/", getAllDoctors); // public listing

router.get("/:id", getDoctorById);


//  Doctor-only routes
router.patch(
  "/",
  authMiddleware,
  authorizeRoles(UserRoleEnum.DOCTOR),
  updateDoctorProfile
);

router.delete(
  "/",
  authMiddleware,
  authorizeRoles(UserRoleEnum.DOCTOR),
  deleteDoctorProfile
);

router.patch(
  "/availability",
  authMiddleware,
  authorizeRoles(UserRoleEnum.DOCTOR),
  toggleDoctorAvailability
);


// // Admin-only routes
// router.patch(
//   "/verify/:id",
//   authMiddlewareAdmin,
//   authorizeRoles(UserRoleEnum.ADMIN),
//   verifyDoctorProfile
// );


export default router;