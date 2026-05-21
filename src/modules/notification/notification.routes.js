import { Router } from "express";
import {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from "./notification.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.get("/me", authMiddleware, getMyNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsAsRead);
router.patch("/:id/read", authMiddleware, markNotificationAsRead);
router.delete("/:id", authMiddleware, deleteNotification);

export default router;
