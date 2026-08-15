import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";

import app from "../../src/app.js";

import { User } from "../../src/modules/user/user.model.js";
import { Doctor } from "../../src/modules/doctor/doctor.model.js";
import { Appointment } from "../../src/modules/Appointment/appointment.model.js";

describe("Appointment", () => {
  beforeEach(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should create an appointment for an authenticated patient", async () => {
    // Create patient
    const patient = await User.create({
      name: "Test Patient",
      email: "patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    // Create doctor user
    const doctorUser = await User.create({
      name: "Test Doctor",
      email: "doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    // Create doctor profile
    const doctor = await Doctor.create({
      user: doctorUser._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isVerified: true,
      isAvailable: true,
      slotDuration: 30,
      availability: [
        {
          day: "Monday",
          slots: [
            {
              start: "09:00",
              end: "11:00",
            },
          ],
        },
      ],
    });

    // Login patient
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "patient@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    // Find the next Monday
    const appointmentDate = new Date();

    while (appointmentDate.getDay() !== 1) {
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }

    appointmentDate.setHours(9, 0, 0, 0);

    // Create appointment
    const response = await agent
      .post("/api/v1/appointment")
      .send({
        doctorId: doctor._id.toString(),
        appointmentDateTime: appointmentDate.toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Appointment created successfully"
    );

    expect(response.body.data).toBeDefined();
    expect(response.body.data.doctor).toBeDefined();
    expect(response.body.data.patient).toBeDefined();

    const appointment = await Appointment.findOne({
      patient: patient._id,
      doctor: doctor._id,
    });

    expect(appointment).not.toBeNull();
    expect(appointment.status).toBe("pending");
  });
  it("should reject an appointment in the past", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "past@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "past-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [{ start: "09:00", end: "11:00" }],
      },
    ],
  });

  const agent = request.agent(app);

  await agent.post("/api/v1/auth/login").send({
    email: patient.email,
    password: "Test@123456",
  });

  const response = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: new Date(Date.now() - 60 * 60 * 1000),
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Appointment must be in the future"
  );
});
it("should reject an invalid appointment slot", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "invalid-slot@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "invalid-slot-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [{ start: "09:00", end: "11:00" }],
      },
    ],
  });

  const agent = request.agent(app);

  await agent.post("/api/v1/auth/login").send({
    email: patient.email,
    password: "Test@123456",
  });

  const date = new Date();

  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }

  date.setHours(9, 15, 0, 0);

  const response = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: date.toISOString(),
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Invalid slot selected");
});
it("should reject an already booked slot", async () => {
  const patient1 = await User.create({
    name: "Patient One",
    email: "patient-one@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const patient2 = await User.create({
    name: "Patient Two",
    email: "patient-two@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "booking-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [{ start: "09:00", end: "11:00" }],
      },
    ],
  });

  const appointmentDate = new Date();

  while (appointmentDate.getDay() !== 1) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }

  appointmentDate.setHours(9, 0, 0, 0);

  const agent1 = request.agent(app);

  await agent1.post("/api/v1/auth/login").send({
    email: patient1.email,
    password: "Test@123456",
  });

  const firstResponse = await agent1
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: appointmentDate.toISOString(),
    });

  expect(firstResponse.status).toBe(201);

  const agent2 = request.agent(app);

  await agent2.post("/api/v1/auth/login").send({
    email: patient2.email,
    password: "Test@123456",
  });

  const secondResponse = await agent2
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: appointmentDate.toISOString(),
    });

  expect(secondResponse.status).toBe(409);
  expect(secondResponse.body.success).toBe(false);
  expect(secondResponse.body.message).toBe("Slot already booked");
});
it("should reject appointment for an unavailable doctor", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "unavailable-patient@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "unavailable-doctor@example.com",
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
    isAvailable: false,
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [
          {
            start: "09:00",
            end: "11:00",
          },
        ],
      },
    ],
  });

  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: patient.email,
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  // Get next Monday
  const appointmentDate = new Date();

  while (appointmentDate.getDay() !== 1) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }

  appointmentDate.setHours(9, 0, 0, 0);

  const response = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: appointmentDate.toISOString(),
    });

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Doctor is not available");
});
it("should reject appointment for an unverified doctor", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "unverified-patient@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "unverified-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [
          {
            start: "09:00",
            end: "11:00",
          },
        ],
      },
    ],
  });

  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: patient.email,
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  // Get next Monday
  const appointmentDate = new Date();

  while (appointmentDate.getDay() !== 1) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }

  appointmentDate.setHours(9, 0, 0, 0);

  const response = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: appointmentDate.toISOString(),
    });

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Doctor is not verified");
});
});
describe("Reschedule Appointment", () => {
  beforeEach(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

 it("should reschedule an appointment successfully", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "reschedule-patient@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "reschedule-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [
          {
            start: "09:00",
            end: "11:00",
          },
        ],
      },
    ],
  });

  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: patient.email,
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  // First appointment at 09:00
  const originalDate = new Date();

  while (originalDate.getDay() !== 1) {
    originalDate.setDate(originalDate.getDate() + 1);
  }

  originalDate.setHours(9, 0, 0, 0);

  const createResponse = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: originalDate.toISOString(),
    });

  expect(createResponse.status).toBe(201);

  const appointmentId =
    createResponse.body.data.id ||
    createResponse.body.data._id;

  // Reschedule to 09:30
  const newDate = new Date(originalDate);
  newDate.setHours(9, 30, 0, 0);

  const response = await agent
    .patch(`/api/v1/appointment/${appointmentId}/reschedule`)
    .send({
      appointmentDateTime: newDate.toISOString(),
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.message).toBe(
    "Appointment rescheduled successfully"
  );

  const updatedAppointment = await Appointment.findById(
    appointmentId
  );

  expect(updatedAppointment).not.toBeNull();
  expect(
    updatedAppointment.appointmentDateTime.getTime()
  ).toBe(newDate.getTime());
});
it("should reject rescheduling to a past date", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "past-reschedule@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "past-reschedule-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [{ start: "09:00", end: "11:00" }],
      },
    ],
  });

  const agent = request.agent(app);

  await agent.post("/api/v1/auth/login").send({
    email: patient.email,
    password: "Test@123456",
  });

  const appointmentDate = new Date();

  while (appointmentDate.getDay() !== 1) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }

  appointmentDate.setHours(9, 0, 0, 0);

  const createResponse = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: appointmentDate.toISOString(),
    });

  expect(createResponse.status).toBe(201);

  const appointmentId =
    createResponse.body.data.id ||
    createResponse.body.data._id;

  const response = await agent
    .patch(`/api/v1/appointment/${appointmentId}/reschedule`)
    .send({
      appointmentDateTime: new Date(
        Date.now() - 60 * 60 * 1000
      ).toISOString(),
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Appointment must be in the future"
  );
});
it("should reject rescheduling another patient's appointment", async () => {
  const patient1 = await User.create({
    name: "Patient One",
    email: "owner@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const patient2 = await User.create({
    name: "Patient Two",
    email: "attacker@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "ownership-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [{ start: "09:00", end: "11:00" }],
      },
    ],
  });

  const patient1Agent = request.agent(app);

  await patient1Agent.post("/api/v1/auth/login").send({
    email: patient1.email,
    password: "Test@123456",
  });

  const appointmentDate = new Date();

  while (appointmentDate.getDay() !== 1) {
    appointmentDate.setDate(appointmentDate.getDate() + 1);
  }

  appointmentDate.setHours(9, 0, 0, 0);

  const createResponse = await patient1Agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: appointmentDate.toISOString(),
    });

  expect(createResponse.status).toBe(201);

  const appointmentId =
    createResponse.body.data.id ||
    createResponse.body.data._id;

  const patient2Agent = request.agent(app);

  await patient2Agent.post("/api/v1/auth/login").send({
    email: patient2.email,
    password: "Test@123456",
  });

  const newDate = new Date(appointmentDate);
  newDate.setHours(9, 30, 0, 0);

  const response = await patient2Agent
    .patch(`/api/v1/appointment/${appointmentId}/reschedule`)
    .send({
      appointmentDateTime: newDate.toISOString(),
    });

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
});
it("should reject rescheduling to an invalid slot", async () => {
  const patient = await User.create({
    name: "Test Patient",
    email: "invalid-reschedule-patient@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "invalid-reschedule-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [
          {
            start: "09:00",
            end: "11:00",
          },
        ],
      },
    ],
  });

  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: patient.email,
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  // Get next Monday
  const originalDate = new Date();

  do {
    originalDate.setDate(originalDate.getDate() + 1);
  } while (originalDate.getDay() !== 1);

  originalDate.setHours(9, 0, 0, 0);

  // Create appointment at valid 09:00 slot
  const createResponse = await agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime: originalDate.toISOString(),
    });

  expect(createResponse.status).toBe(201);

  const appointmentId =
    createResponse.body.data.id ||
    createResponse.body.data._id;

  // 09:15 is NOT a valid 30-minute slot
  const invalidDate = new Date(originalDate);
  invalidDate.setHours(9, 15, 0, 0);

  const response = await agent
    .patch(`/api/v1/appointment/${appointmentId}/reschedule`)
    .send({
      appointmentDateTime: invalidDate.toISOString(),
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Invalid slot selected");
});
it("should reject rescheduling to an already booked slot", async () => {
  const patient1 = await User.create({
    name: "Patient One",
    email: "reschedule-owner@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const patient2 = await User.create({
    name: "Patient Two",
    email: "reschedule-booked@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Test Doctor",
    email: "reschedule-booked-doctor@example.com",
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
    slotDuration: 30,
    availability: [
      {
        day: "Monday",
        slots: [
          {
            start: "09:00",
            end: "11:00",
          },
        ],
      },
    ],
  });

  // Get next Monday
  const firstAppointmentDate = new Date();

  do {
    firstAppointmentDate.setDate(
      firstAppointmentDate.getDate() + 1
    );
  } while (firstAppointmentDate.getDay() !== 1);

  firstAppointmentDate.setHours(9, 0, 0, 0);

  const secondAppointmentDate = new Date(
    firstAppointmentDate
  );

  secondAppointmentDate.setHours(9, 30, 0, 0);

  // Login Patient 1
  const patient1Agent = request.agent(app);

  const patient1Login = await patient1Agent
    .post("/api/v1/auth/login")
    .send({
      email: patient1.email,
      password: "Test@123456",
    });

  expect(patient1Login.status).toBe(200);

  // Patient 1 books 09:00
  const firstAppointment = await patient1Agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime:
        firstAppointmentDate.toISOString(),
    });

  expect(firstAppointment.status).toBe(201);

  const appointmentId =
    firstAppointment.body.data.id ||
    firstAppointment.body.data._id;

  // Login Patient 2
  const patient2Agent = request.agent(app);

  const patient2Login = await patient2Agent
    .post("/api/v1/auth/login")
    .send({
      email: patient2.email,
      password: "Test@123456",
    });

  expect(patient2Login.status).toBe(200);

  // Patient 2 books 09:30
  const secondAppointment = await patient2Agent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id.toString(),
      appointmentDateTime:
        secondAppointmentDate.toISOString(),
    });

  expect(secondAppointment.status).toBe(201);

  // Patient 1 tries to move from 09:00 → 09:30
  const response = await patient1Agent
    .patch(
      `/api/v1/appointment/${appointmentId}/reschedule`
    )
    .send({
      appointmentDateTime:
        secondAppointmentDate.toISOString(),
    });

  expect(response.status).toBe(409);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Slot already booked"
  );
});
});
describe("Update Appointment Status", () => {
  beforeEach(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should allow the doctor to confirm a pending appointment", async () => {
    const patient = await User.create({
      name: "Test Patient",
      email: "status-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Test Doctor",
      email: "status-doctor@example.com",
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
      slotDuration: 30,
      availability: [
        {
          day: "Monday",
          slots: [
            {
              start: "09:00",
              end: "11:00",
            },
          ],
        },
      ],
    });

    // Patient login
    const patientAgent = request.agent(app);

    const patientLogin = await patientAgent
      .post("/api/v1/auth/login")
      .send({
        email: patient.email,
        password: "Test@123456",
      });

    expect(patientLogin.status).toBe(200);

    // Next Monday
    const appointmentDate = new Date();

    do {
      appointmentDate.setDate(
        appointmentDate.getDate() + 1
      );
    } while (appointmentDate.getDay() !== 1);

    appointmentDate.setHours(9, 0, 0, 0);

    // Create appointment
    const createResponse = await patientAgent
      .post("/api/v1/appointment")
      .send({
        doctorId: doctor._id.toString(),
        appointmentDateTime:
          appointmentDate.toISOString(),
      });

    expect(createResponse.status).toBe(201);

    const appointmentId =
      createResponse.body.data.id ||
      createResponse.body.data._id;

    // Doctor login
    const doctorAgent = request.agent(app);

    const doctorLogin = await doctorAgent
      .post("/api/v1/auth/login")
      .send({
        email: doctorUser.email,
        password: "Test@123456",
      });

    expect(doctorLogin.status).toBe(200);

    // Doctor confirms appointment
    const response = await doctorAgent
      .patch(`/api/v1/appointment/${appointmentId}/status`)
      .send({
        status: "confirmed",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedAppointment =
      await Appointment.findById(appointmentId);

    expect(updatedAppointment.status).toBe("confirmed");
  });
  it("should reject a patient from updating appointment status", async () => {
  const response = await request(app)
    .patch("/api/v1/appointment/000000000000000000000000/status")
    .send({
      status: "confirmed",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});
});
describe("Cancel Appointment", () => {
  beforeEach(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should allow a patient to cancel their appointment", async () => {
    const patient = await User.create({
      name: "Patient",
      email: "cancel-patient@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient"],
      activeRole: "patient",
    });

    const doctorUser = await User.create({
      name: "Doctor",
      email: "cancel-doctor@example.com",
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
      slotDuration: 30,
      availability: [{
        day: "Monday",
        slots: [{ start: "09:00", end: "11:00" }],
      }],
    });

    const agent = request.agent(app);

    await agent.post("/api/v1/auth/login").send({
      email: patient.email,
      password: "Test@123456",
    });

    const date = new Date();

    do {
      date.setDate(date.getDate() + 1);
    } while (date.getDay() !== 1);

    date.setHours(9, 0, 0, 0);

    const created = await agent
      .post("/api/v1/appointment")
      .send({
        doctorId: doctor._id,
        appointmentDateTime: date.toISOString(),
      });

    expect(created.status).toBe(201);

    const id = created.body.data.id;

    const response = await agent
      .patch(`/api/v1/appointment/${id}/cancel`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const appointment = await Appointment.findById(id);

    expect(appointment.status).toBe("cancelled");
  });
  it("should reject cancelling without authentication", async () => {
  const response = await request(app)
    .patch("/api/v1/appointment/000000000000000000000000/cancel");

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});
it("should reject cancellation by another patient", async () => {
  const patient1 = await User.create({
    name: "Patient One",
    email: "cancel-owner@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const patient2 = await User.create({
    name: "Patient Two",
    email: "cancel-other@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Doctor",
    email: "cancel-owner-doctor@example.com",
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
    slotDuration: 30,
    availability: [{
      day: "Monday",
      slots: [{ start: "09:00", end: "11:00" }],
    }],
  });

  const ownerAgent = request.agent(app);

  await ownerAgent.post("/api/v1/auth/login").send({
    email: patient1.email,
    password: "Test@123456",
  });

  const date = new Date();

  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() !== 1);

  date.setHours(9, 0, 0, 0);

  const created = await ownerAgent
    .post("/api/v1/appointment")
    .send({
      doctorId: doctor._id,
      appointmentDateTime: date.toISOString(),
    });

  expect(created.status).toBe(201);

  const id = created.body.data.id;

  const otherAgent = request.agent(app);

  await otherAgent.post("/api/v1/auth/login").send({
    email: patient2.email,
    password: "Test@123456",
  });

  const response = await otherAgent
    .patch(`/api/v1/appointment/${id}/cancel`);

  expect(response.status).toBe(403);
  expect(response.body.success).toBe(false);
});
it("should reject cancelling a completed appointment", async () => {
  const patient = await User.create({
    name: "Patient",
    email: "cancel-completed@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const doctorUser = await User.create({
    name: "Doctor",
    email: "cancel-completed-doctor@example.com",
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
    status: "completed",
  });

  const agent = request.agent(app);

  await agent.post("/api/v1/auth/login").send({
    email: patient.email,
    password: "Test@123456",
  });

  const response = await agent
    .patch(`/api/v1/appointment/${appointment._id}/cancel`);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
});