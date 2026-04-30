import { Router } from "express";
import { registerUser as register, loginUser as login, logoutUser as logout, verifyEmail, resendEmailVerification, forgotPassword, resetPassword, changePassword,refreshAccessToken,getCurrentUser } from "./user.auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import{validate} from "../../middleware/validate.middleware.js"
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "./user.auth.validation.js";

const router = Router();

router.route("/register").post(validate(registerSchema), register);
router.route("/login").post(validate(loginSchema), login);

router.route("/logout").post(authMiddleware, logout);
router.route("/verify-email/:token").get(verifyEmail);
router.route("/resend-email-verification").post(resendEmailVerification);
router.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPassword);
router.route("/reset-password/:token").post(validate(resetPasswordSchema), resetPassword);
router.route("/change-password").post(authMiddleware, validate(changePasswordSchema), changePassword);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/current-user").get(authMiddleware, getCurrentUser);
export default router