import mongoose, { Schema } from "mongoose";
import {
  AvailableNotificationTypes
} from "../../utils/constants.js";

const notificationSchema = new Schema(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    type: {
      type: String,
      enum: AvailableNotificationTypes,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    message: {
      type: String,
      required: true,
      trim: true
    },
    isRead: {
      type: Boolean,
      default: false
    },
    entityId: {
      type: Schema.Types.ObjectId
    },
    entityType: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
