import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

import { User } from "../../src/modules/user/user.model.js";
import { Notification } from "../../src/modules/notification/notification.model.js";

import { NOTIFICATION_TYPES } from "../../src/utils/constants.js";

describe("Notifications", () => {
  beforeEach(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({});
  });

  it("should return user's notifications with pagination", async () => {
    const user = await User.create({
      name: "Notification User",
      email: "notification-user@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    await Notification.create([
      {
        recipient: user._id,
        type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
        title: "Appointment Confirmed",
        message: "Your appointment was confirmed",
        isRead: false,
      },
      {
        recipient: user._id,
        type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
        title: "Payment Successful",
        message: "Payment received",
        isRead: true,
      },
    ]);

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: user.email,
      password: "Test@123456",
    });

    const response = await agent
      .get("/api/v1/notification/me")
      .query({
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.notifications).toHaveLength(2);
    expect(response.body.data.total).toBe(2);
    expect(response.body.data.unreadCount).toBe(1);
    expect(response.body.data.page).toBe(1);
    expect(response.body.data.limit).toBe(10);
  });

  it("should mark a notification as read", async () => {
    const user = await User.create({
      name: "Notification User",
      email: "notification-read@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const notification = await Notification.create({
      recipient: user._id,
      type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
      title: "Appointment",
      message: "Appointment confirmed",
      isRead: false,
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: user.email,
      password: "Test@123456",
    });

    const response = await agent.patch(
      `/api/v1/notification/${notification._id}/read`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Notification marked as read"
    );

    const updated = await Notification.findById(
      notification._id
    );

    expect(updated.isRead).toBe(true);
  });

  it("should mark all notifications as read", async () => {
    const user = await User.create({
      name: "Notification User",
      email: "notification-all@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    await Notification.create([
      {
        recipient: user._id,
        type: NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
        title: "Appointment 1",
        message: "Appointment confirmed",
        isRead: false,
      },
      {
        recipient: user._id,
        type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
        title: "Payment 1",
        message: "Payment successful",
        isRead: false,
      },
    ]);

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: user.email,
      password: "Test@123456",
    });

    const response = await agent.patch(
      "/api/v1/notification/read-all"
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "All notifications marked as read"
    );
    expect(response.body.data.modifiedCount).toBe(2);

    const unread = await Notification.countDocuments({
      recipient: user._id,
      isRead: false,
    });

    expect(unread).toBe(0);
  });

  it("should delete a notification", async () => {
    const user = await User.create({
      name: "Notification User",
      email: "notification-delete@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const notification = await Notification.create({
      recipient: user._id,
      type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
      title: "Appointment",
      message: "Appointment cancelled",
      isRead: false,
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: user.email,
      password: "Test@123456",
    });

    const response = await agent.delete(
      `/api/v1/notification/${notification._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Notification deleted successfully"
    );

    const deleted = await Notification.findById(
      notification._id
    );

    expect(deleted).toBeNull();
  });
});