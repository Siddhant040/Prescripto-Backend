import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

import { User } from "../../src/modules/user/user.model.js";
import { Doctor } from "../../src/modules/doctor/doctor.model.js";
import { Appointment } from "../../src/modules/Appointment/appointment.model.js";
import { Payment } from "../../src/modules/payment/payment.model.js";

describe("Create Payment Order", () => {
  beforeEach(async () => {
    await Payment.deleteMany({});
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should create a payment order for patient's appointment", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "payment-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "payment-doctor@example.com",
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
      .post("/api/v1/payment/create-order")
      .send({
        appointmentId: appointment._id.toString(),
        provider: "cash",
        currency: "INR",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.payment).toBeDefined();
    expect(response.body.data.providerOrder).toBeDefined();

    const payment = await Payment.findOne({
      appointment: appointment._id,
    });

    expect(payment.status).toBe("pending");
    expect(payment.amount).toBe(1000);
    expect(payment.provider).toBe("cash");
  });
    it("should reject payment for another patient's appointment", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "payment-owner@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const otherPatient = await User.create({
      name: "Other Patient",
      email: "payment-other@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "payment-owner-doctor@example.com",
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
      email: otherPatient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/payment/create-order")
      .send({
        appointmentId: appointment._id.toString(),
        provider: "cash",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You can only pay for your own appointment"
    );
  });
    it("should reject creating an order for an already paid appointment", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "already-paid@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "already-paid-doctor@example.com",
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

    await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctor._id,
      amount: 1000,
      currency: "INR",
      provider: "cash",
      providerOrderId: "order-paid",
      status: "paid",
      paidAt: new Date(),
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/payment/create-order")
      .send({
        appointmentId: appointment._id.toString(),
        provider: "cash",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Payment is already completed for this appointment"
    );
  });
});
describe("Verify Payment", () => {
  it("should verify a cash payment successfully", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "verify-payment@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "verify-payment-doctor@example.com",
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

    const payment = await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctor._id,
      amount: 1000,
      currency: "INR",
      provider: "cash",
      providerOrderId: "cash-order-123",
      status: "pending",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/payment/verify")
      .send({
        providerOrderId: payment.providerOrderId,
        providerPaymentId: "cash-payment-123",
        providerSignature: "cash-signature",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedPayment = await Payment.findById(payment._id);

    expect(updatedPayment.status).toBe("paid");
    expect(updatedPayment.providerPaymentId).toBe(
      "cash-payment-123"
    );
    expect(updatedPayment.paidAt).toBeDefined();
  });
    it("should reject verification for another patient's payment", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "payment-owner@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const otherPatient = await User.create({
      name: "Other",
      email: "payment-other@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "verify-owner-doctor@example.com",
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
      appointmentDateTime: new Date(Date.now() + 86400000),
      status: "confirmed",
    });

    const payment = await Payment.create({
      appointment: appointment._id,
      patient: owner._id,
      doctor: doctor._id,
      amount: 1000,
      provider: "cash",
      providerOrderId: "owner-order",
      status: "pending",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: otherPatient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/payment/verify")
      .send({
        providerOrderId: payment.providerOrderId,
        providerPaymentId: "payment-123",
        providerSignature: "signature",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
    it("should reject verification when payment order does not exist", async () => {
  const patient = await User.create({
    name: "Patient",
    email: "missing-payment@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const agent = request.agent(app);

  await agent.post("/api/v1/auth/login").send({
    email: patient.email,
    password: "Test@123456",
  });

  const response = await agent
    .post("/api/v1/payment/verify")
    .send({
      providerOrderId: "non-existent-order",
      providerPaymentId: "payment-123",
      providerSignature: "signature",
    });

  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Pending payment order not found"
  );
});

});
describe("Fail Payment", () => {
  it("should mark a pending payment as failed", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "fail-payment@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "fail-payment-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
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
      appointmentDateTime: new Date(Date.now() + 86400000),
      status: "confirmed",
    });

    const payment = await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctor._id,
      amount: 1000,
      currency: "INR",
      provider: "cash",
      providerOrderId: "fail-order-123",
      status: "pending",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/payment/fail")
      .send({
        providerOrderId: payment.providerOrderId,
        failureReason: "Payment cancelled by user",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedPayment = await Payment.findById(payment._id);

    expect(updatedPayment.status).toBe("failed");
    expect(updatedPayment.failureReason).toBe(
      "Payment cancelled by user"
    );
    expect(updatedPayment.failedAt).toBeDefined();
  });
  it("should reject another patient from failing the payment", async () => {
    const owner = await User.create({
      name: "Owner",
      email: "fail-owner@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const otherPatient = await User.create({
      name: "Other",
      email: "fail-other@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "fail-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
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
      appointmentDateTime: new Date(Date.now() + 86400000),
      status: "confirmed",
    });

    const payment = await Payment.create({
      appointment: appointment._id,
      patient: owner._id,
      doctor: doctor._id,
      amount: 1000,
      provider: "cash",
      providerOrderId: "owner-fail-order",
      status: "pending",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: otherPatient.email,
      password: "Test@123456",
    });

    const response = await agent
      .post("/api/v1/payment/fail")
      .send({
        providerOrderId: payment.providerOrderId,
        failureReason: "Not my payment",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});
describe("Get My Payments", () => {
  it("should return the authenticated patient's payments", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "my-payments@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "my-payments-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
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
      appointmentDateTime: new Date(Date.now() + 86400000),
      status: "confirmed",
    });

    await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctor._id,
      amount: 1000,
      currency: "INR",
      provider: "cash",
      providerOrderId: "my-payment-order",
      status: "paid",
      paidAt: new Date(),
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent.get("/api/v1/payment/me");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it("should reject unauthenticated access", async () => {
    const response = await request(app)
      .get("/api/v1/payment/me");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
describe("Get Payment By ID", () => {
  it("should return the patient's payment", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "payment-by-id@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "payment-by-id-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
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
      appointmentDateTime: new Date(Date.now() + 86400000),
      status: "confirmed",
    });

    const payment = await Payment.create({
      appointment: appointment._id,
      patient: patient._id,
      doctor: doctor._id,
      amount: 1000,
      provider: "cash",
      providerOrderId: "payment-by-id-order",
      status: "paid",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent.get(
      `/api/v1/payment/${payment._id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
  });

  it("should reject an invalid payment ID", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "invalid-payment-id@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const response = await agent.get(
      "/api/v1/payment/invalid-id"
    );

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
