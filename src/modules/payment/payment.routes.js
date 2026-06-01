import { Router } from "express";
import {
  createPaymentOrder,
  failPayment,
  getMyPayments,
  getPaymentById,
  verifyPayment
} from "./payment.controller.js";
import {
  createPaymentOrderSchema,
  failPaymentSchema,
  verifyPaymentSchema
} from "./payment.validation.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { UserRoleEnum } from "../../utils/constants.js";

const router = Router();

router.use(authMiddleware);

router.post(
  "/create-order",
  authorizeRoles(UserRoleEnum.PATIENT),
  validate(createPaymentOrderSchema),
  createPaymentOrder
);

router.post(
  "/verify",
  authorizeRoles(UserRoleEnum.PATIENT),
  validate(verifyPaymentSchema),
  verifyPayment
);

router.post(
  "/fail",
  authorizeRoles(UserRoleEnum.PATIENT),
  validate(failPaymentSchema),
  failPayment
);

router.get(
  "/me",
  authorizeRoles(
    UserRoleEnum.PATIENT,
    UserRoleEnum.DOCTOR,
    UserRoleEnum.ADMIN
  ),
  getMyPayments
);

router.get(
  "/:id",
  authorizeRoles(
    UserRoleEnum.PATIENT,
    UserRoleEnum.DOCTOR,
    UserRoleEnum.ADMIN
  ),
  getPaymentById
);

export default router;
