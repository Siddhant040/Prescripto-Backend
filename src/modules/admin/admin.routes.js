import { Router } from "express";
import {
  getAdminDashboard,
  getAllDoctorsForAdmin,
  verifyDoctorByAdmin,
  getAllAppointmentsForAdmin,
  getAllReviewsForAdmin,
  deleteReviewByAdmin
} from "./admin.controller.js";
import {  authMiddlewareAdmin } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { UserRoleEnum } from "../../utils/constants.js";

const router = Router();

router.use(authMiddlewareAdmin, authorizeRoles(UserRoleEnum.ADMIN));

router.get("/dashboard", getAdminDashboard);
router.get("/doctors", getAllDoctorsForAdmin);
router.patch("/doctors/:id/verify", verifyDoctorByAdmin);
router.get("/appointments", getAllAppointmentsForAdmin);
router.get("/reviews", getAllReviewsForAdmin);
router.delete("/reviews/:id", deleteReviewByAdmin);

export default router;
