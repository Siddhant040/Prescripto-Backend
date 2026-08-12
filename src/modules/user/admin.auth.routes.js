import { Router } from "express";
import { authMiddlewareAdmin } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  adminLogin,
  getCurrentAdmin as getCurrentUser,
  logoutAdmin as logout,
  adminRefreshAccessToken as refreshAccessToken,
} from "./admin.auth.controller.js";
import {
  loginSchema
} from "./user.auth.validation.js";

const router = Router();



router.post("/admin-login",

  validate(loginSchema), adminLogin);


// router.post("/upload-avatar", authMiddlewareAdmin, upload.single("avatar"), uploadUserAvatar);

router.post("/logout", authMiddlewareAdmin, logout);









// router.post(
//   "/change-password",
//   authMiddlewareAdmin,
//   validate(changePasswordSchema),
//   changePassword
// );

router.post("/refresh-token", refreshAccessToken);

router.get("/me", authMiddlewareAdmin, getCurrentUser);
// router.patch("/me", authMiddlewareAdmin, validate(updateProfileSchema), updateUserprofile);



export default router;
