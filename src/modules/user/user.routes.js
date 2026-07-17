import { Router } from "express";
import { upload } from "../../middleware/multer.middleware.js";
import {
  registerUser as register,
  loginUser as login,
  logoutUser as logout,
  verifyEmail,
  resendEmailVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refreshAccessToken,
  getCurrentUser,
  uploadUserAvatar,
  updateUserprofile,
  userActiveRole
} from "./user.auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
   updateActiveRoleSchema
} from "./user.auth.validation.js";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

router.post("/upload-avatar", authMiddleware, upload.single("avatar"), uploadUserAvatar);

router.post("/logout", authMiddleware, logout);

router.get("/verify-email/:token", verifyEmail);

router.post(
  "/resend-email-verification",
  resendEmailVerification
);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

router.post(
  "/reset-password/:token",
  validate(resetPasswordSchema),
  resetPassword
);

router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  changePassword
);

router.post("/refresh-token", refreshAccessToken);

router.get("/me", authMiddleware, getCurrentUser);
router.patch("/me", authMiddleware, validate(updateProfileSchema), updateUserprofile);
router.patch("/active-role", authMiddleware, validate(updateActiveRoleSchema), userActiveRole);


export default router;
