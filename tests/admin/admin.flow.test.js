import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

import { User } from "../../src/modules/user/user.model.js";
import { Doctor } from "../../src/modules/doctor/doctor.model.js";
import { Appointment } from "../../src/modules/Appointment/appointment.model.js";
import { Review } from "../../src/modules/review/review.model.js";
import { Notification } from "../../src/modules/notification/notification.model.js";

let agent;
let admin;

describe("Admin", () => {
  beforeEach(async () => {
    await Review.deleteMany({});
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await Notification.deleteMany({});
    await User.deleteMany({});

    admin = await User.create({
      name: "Admin",
      email: "admin-test@example.com",
      password: "Admin@123456",
      isEmailVerified: true,
      roles: ["admin"],
      activeRole: "admin",
    });

    agent = request.agent(app);

    await agent.post("/api/v1/auth2/admin/admin-login").send({
      email: admin.email,
      password: "Admin@123456",
    });
  });

  it("should return admin dashboard statistics", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "dashboard-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "dashboard-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: true,
      isAvailable: true,
    });

    await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(),
      status: "pending",
    });

    await Notification.create({
      recipient: patient._id,
      type: "system",
      title: "System",
      message: "Test notification",
    });

    const response = await agent.get("/api/v1/admin/dashboard");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Admin dashboard fetched successfully"
    );

    expect(response.body.data.users).toBe(2);
    expect(response.body.data.doctors).toBe(1);
    expect(response.body.data.verifiedDoctors).toBe(1);
    expect(response.body.data.appointments).toBe(1);
    expect(response.body.data.pendingAppointments).toBe(1);
    expect(response.body.data.notifications).toBe(1);
  });

  it("should return doctors with verification filter", async () => {
    const doctorUser = await User.create({
      name: "Unverified Doctor",
      email: "admin-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: false,
      isAvailable: true,
    });

    const response = await agent
      .get("/api/v1/admin/doctors")
      .query({
        page: 1,
        limit: 10,
        isVerified: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctors).toHaveLength(1);
    expect(response.body.data.doctors[0].isVerified).toBe(false);
    expect(response.body.data.total).toBe(1);
  });

  it("should verify an unverified doctor", async () => {
    const doctorUser = await User.create({
      name: "Doctor",
      email: "verify-admin-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: false,
      isAvailable: true,
    });

    const response = await agent.patch(
      `/api/v1/admin/doctors/${doctor._id}/verify`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Doctor verified successfully"
    );

    const updatedDoctor = await Doctor.findById(doctor._id);

    expect(updatedDoctor.isVerified).toBe(true);
  });

  it("should return appointments with status filter", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "admin-appointment-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "admin-appointment-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: true,
      isAvailable: true,
    });

    await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(),
      status: "pending",
    });

    const response = await agent
      .get("/api/v1/admin/appointments")
      .query({
        status: "pending",
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.appointments).toHaveLength(1);
    expect(response.body.data.total).toBe(1);
  });

  it("should return active reviews", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "admin-review-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "admin-review-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: true,
      isAvailable: true,
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(),
      status: "completed",
    });

    await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Excellent",
      isDeleted: false,
    });

    const response = await agent
      .get("/api/v1/admin/reviews")
      .query({
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reviews).toHaveLength(1);
    expect(response.body.data.total).toBe(1);
  });

  it("should delete a review and recalculate doctor rating", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "admin-delete-review-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "admin-delete-review-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: true,
      isAvailable: true,
      rating: 5,
      totalReviews: 1,
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(),
      status: "completed",
    });

    const review = await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Excellent",
      isDeleted: false,
    });

    const response = await agent.delete(
      `/api/v1/admin/reviews/${review._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Review deleted successfully"
    );

    const deletedReview = await Review.findById(review._id);
    const updatedDoctor = await Doctor.findById(doctor._id);

    expect(deletedReview.isDeleted).toBe(true);
    expect(updatedDoctor.rating).toBe(0);
    expect(updatedDoctor.totalReviews).toBe(0);
  });
});