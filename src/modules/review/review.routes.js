import { Router } from "express";
import {
  createReview,
  getReviewsByDoctor,
  getReviewsByPatient,
  getReviewsByid,
  updateReview,
  deleteReview
} from "./review.controller.js";

import {createReviewSchema, updateReviewSchema} from "./review.validation.js";
import { validate } from "../../middleware/validate.middleware.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = Router();

router.post(
  "/",
  authMiddleware,
  authorizeRoles("patient"),
  validate(createReviewSchema),
  createReview
);

router.get(
  "/doctor/me",
  authMiddleware,
  authorizeRoles("doctor"),
  getReviewsByDoctor
);

router.get(
  "/me",
  authMiddleware,
  authorizeRoles("patient"),
  getReviewsByPatient
);

router.get("/:id", (req, res, next) => {
  console.log("Review route hit:", req.params.id);
  next();
}, getReviewsByid);

router.patch(
  "/:id",
  authMiddleware,
  authorizeRoles("patient"),
  validate(updateReviewSchema),
  updateReview
);

router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("patient"),
  deleteReview
);

export default router;
