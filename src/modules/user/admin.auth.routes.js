import { Router } from "express";
import { upload } from "../../middleware/multer.middleware.js";
import {
  
  logoutAdmin as logout,
  adminLogin,

  
  adminRefreshAccessToken as refreshAccessToken,
  getCurrentAdmin as getCurrentUser,
 
  
  
} from "./admin.auth.controller.js";
import {  authMiddlewareAdmin } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import {
  
  loginSchema,
  
  changePasswordSchema,
  updateProfileSchema,
   
} from "./user.auth.validation.js";

const router = Router();
console.log("Admin auth routes loaded");



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
