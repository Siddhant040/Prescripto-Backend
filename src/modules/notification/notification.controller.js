import mongoose from "mongoose";
import { Notification } from "./notification.model.js";
import {
  mapNotificationToDTO,
  mapNotificationsToDTO
} from "./notification.dto.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";

const notificationPopulate = {
  path: "sender",
  select: "name email avatar"
};

export const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  entityId,
  entityType
}) => {
  if (!recipient || !type || !title || !message) {
    return null;
  }

  return Notification.create({
    recipient,
    sender,
    type,
    title,
    message,
    entityId,
    entityType
  });
};

const getMyNotifications = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = { recipient: req.user._id };

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate(notificationPopulate)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: req.user._id, isRead: false })
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications: mapNotificationsToDTO(notifications),
        total,
        unreadCount,
        page,
        limit
      },
      "Notifications fetched successfully"
    )
  );
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const notification = await Notification.findOne({
    _id: id,
    recipient: req.user._id
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  notification.isRead = true;
  await notification.save();

  const populatedNotification = await notification.populate(notificationPopulate);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapNotificationToDTO(populatedNotification),
      "Notification marked as read"
    )
  );
});

const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      { modifiedCount: result.modifiedCount },
      "All notifications marked as read"
    )
  );
});

const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid notification ID");
  }

  const notification = await Notification.findOneAndDelete({
    _id: id,
    recipient: req.user._id
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return res.status(200).json(
    new ApiResponse(200, null, "Notification deleted successfully")
  );
});

export {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
};
