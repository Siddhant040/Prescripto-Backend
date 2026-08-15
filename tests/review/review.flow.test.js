import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

import { User } from "../../src/modules/user/user.model.js";
import { Doctor } from "../../src/modules/doctor/doctor.model.js";
import { Appointment } from "../../src/modules/Appointment/appointment.model.js";
import { Review } from "../../src/modules/review/review.model.js";

describe("Create Review", () => {
  beforeEach(async () => {
    await Review.deleteMany({});
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should create a review for a completed appointment", async () => {
    const patient = await User.create({
      name: "Review Patient",
      email: "review-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Review Doctor",
      email: "review-doctor@example.com",
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
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/review")
      .send({
        appointmentId: appointment._id.toString(),
        rating: 5,
        review: "Excellent doctor",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Review created successfully"
    );

    const review = await Review.findOne({
      appointment: appointment._id,
    });

    expect(review).toBeTruthy();
    expect(review.rating).toBe(5);
  });

  it("should reject review for an incomplete appointment", async () => {
    const patient = await User.create({
      name: "Review Patient",
      email: "review-incomplete@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Review Doctor",
      email: "review-incomplete-doctor@example.com",
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
      appointmentDateTime: new Date(Date.now() + 86400000),
      status: "confirmed",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/review")
      .send({
        appointmentId: appointment._id.toString(),
        rating: 5,
        review: "Excellent doctor",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Review is allowed only for completed appointments"
    );
  });

  it("should reject a duplicate review", async () => {
    const patient = await User.create({
      name: "Review Patient",
      email: "review-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Review Doctor",
      email: "review-doctor@example.com",
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
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Already reviewed",
    });

    const response = await agent
      .post("/api/v1/review")
      .send({
        appointmentId: appointment._id.toString(),
        rating: 4,
        review: "Trying again",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You have already submitted a review for this appointment"
    );
  });

  it("should reject reviewing another patient's appointment", async () => {
    const patient = await User.create({
      name: "Review Patient",
      email: "review-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const otherPatient = await User.create({
      name: "Other Patient",
      email: "other-review@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Review Doctor",
      email: "review-doctor@example.com",
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
      patient: otherPatient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/review")
      .send({
        appointmentId: appointment._id.toString(),
        rating: 5,
        review: "Not mine",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You can only review appointments that belong to you"
    );
  });
});
describe("Update Review", () => {
  it("should update the patient's own review", async () => {
    const patient = await User.create({
      name: "Review Patient",
      email: "update-review@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Review Doctor",
      email: "update-review-doctor@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const review = await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 3,
      review: "Good doctor",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .patch(`/api/v1/review/${review._id}`)
      .send({
        rating: 5,
        review: "Excellent doctor",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Review updated successfully"
    );

    const updated = await Review.findById(review._id);

    expect(updated.rating).toBe(5);
    expect(updated.review).toBe("Excellent doctor");
    expect(updated.isEdited).toBe(true);
  });

  it("should reject updating another patient's review", async () => {
    const owner = await User.create({
      name: "Review Owner",
      email: "review-owner@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const otherPatient = await User.create({
      name: "Other Patient",
      email: "review-updater@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "update-owner-doctor@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: owner._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const review = await Review.create({
      patient: owner._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 4,
      review: "Good",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: otherPatient.email,
      password: "Test@123456",
    });

    const response = await agent
      .patch(`/api/v1/review/${review._id}`)
      .send({
        rating: 1,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You can only update your own review"
    );
  });
});
describe("Delete Review", () => {
  it("should delete the patient's own review", async () => {
    const patient = await User.create({
      name: "Delete Patient",
      email: "delete-review@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Delete Doctor",
      email: "delete-review-doctor@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const review = await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Excellent",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent.delete(
      `/api/v1/review/${review._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Review deleted successfully"
    );

    const deletedReview = await Review.findById(review._id);

    expect(deletedReview.isDeleted).toBe(true);
  });

  it("should reject deleting another patient's review", async () => {
    const owner = await User.create({
      name: "Review Owner",
      email: "delete-owner@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const otherPatient = await User.create({
      name: "Other Patient",
      email: "delete-other@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "delete-owner-doctor@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: owner._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const review = await Review.create({
      patient: owner._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 4,
      review: "Good",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: otherPatient.email,
      password: "Test@123456",
    });

    const response = await agent.delete(
      `/api/v1/review/${review._id}`
    );

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You can only delete your own review"
    );
  });
});
describe("Read Reviews", () => {
  it("should return patient's reviews", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "read-reviews@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "read-reviews-doctor@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Excellent",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent.get("/api/v1/review/me");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.reviews).toHaveLength(1);
  });

  it("should return a review by ID", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "review-id@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "review-id-doctor@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    const review = await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Excellent",
    });

    const response = await request(app).get(
      `/api/v1/review/${review._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("should return reviews by doctor ID", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "doctor-reviews-Patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "doctor-reviews@example.com",
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
    });

    const appointment = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      appointmentDateTime: new Date(Date.now() - 86400000),
      status: "completed",
    });

    await Review.create({
      patient: patient._id,
      doctor: doctor._id,
      appointment: appointment._id,
      rating: 5,
      review: "Excellent",
    });

    const response = await request(app).get(
      `/api/v1/review/doctor/${doctor._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
  });

  it("should reject an invalid review ID", async () => {
    const response = await request(app).get(
      "/api/v1/review/invalid-id"
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});