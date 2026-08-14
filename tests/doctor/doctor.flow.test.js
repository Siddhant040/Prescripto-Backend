import { describe, expect, it, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/modules/user/user.model.js";
import { Doctor } from "../../src/modules/doctor/doctor.model.js";
const createAuthenticatedDoctor = async () => {
  const agent = request.agent(app);

  const user = await User.create({
    name: "Dr. Schedule",
    email: `schedule-${Date.now()}@example.com`,
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient", "doctor"],
    activeRole: "doctor",
  });

  await Doctor.create({
    user: user._id,
    specialization: "Cardiology",
    experience: 5,
    consultationFee: 1000,
    slotDuration: 30,
  });

  await agent
    .post("/api/v1/auth/login")
    .send({
      email: user.email,
      password: "Test@123456",
    });

  return agent;
};


describe("Doctor", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });
  it("should create a doctor profile for an authenticated patient", async () => {
  const agent = request.agent(app);

  await User.create({
    name: "Test Patient",
    email: "doctor@example.com",
    password: "Test@123456",
    isEmailVerified: true,
  });

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: "doctor@example.com",
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  const response = await agent
    .post("/api/v1/doctor")
    .send({
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      bio: "Experienced cardiologist",
      clinicAddress: "Delhi",
      qualifications: ["MBBS", "MD"],
    });

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.message).toBe(
    "Doctor profile created successfully"
  );

  const user = await User.findOne({
    email: "doctor@example.com",
  });

  const doctor = await Doctor.findOne({
    user: user._id,
  });

  expect(doctor).toBeDefined();
  expect(doctor.specialization).toBe("Cardiology");

  expect(user.roles).toContain("doctor");
  expect(user.activeRole).toBe("doctor");
});
it("should reject doctor profile creation without authentication", async () => {
  const response = await request(app)
    .post("/api/v1/doctor")
    .send({
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});
it("should reject duplicate doctor profile creation", async () => {
  const agent = request.agent(app);

  await User.create({
    name: "Test Patient",
    email: "doctor@example.com",
    password: "Test@123456",
    isEmailVerified: true,
  });

  await agent
    .post("/api/v1/auth/login")
    .send({
      email: "doctor@example.com",
      password: "Test@123456",
    });

  const doctorData = {
    specialization: "Cardiology",
    experience: 5,
    consultationFee: 1000,
    bio: "Experienced cardiologist",
    clinicAddress: "Delhi",
    qualifications: ["MBBS", "MD"],
  };

  const firstResponse = await agent
    .post("/api/v1/doctor")
    .send(doctorData);

  expect(firstResponse.status).toBe(201);

  const secondResponse = await agent
    .post("/api/v1/doctor")
    .send(doctorData);

  expect(secondResponse.status).toBe(409);
  expect(secondResponse.body.success).toBe(false);
  expect(secondResponse.body.message).toBe(
    "Doctor profile already exists"
  );
});
it("should reject doctor profile with invalid specialization", async () => {
  const agent = request.agent(app);

  await User.create({
    name: "Test Patient",
    email: "doctor@example.com",
    password: "Test@123456",
    isEmailVerified: true,
  });

  await agent
    .post("/api/v1/auth/login")
    .send({
      email: "doctor@example.com",
      password: "Test@123456",
    });

  const response = await agent
    .post("/api/v1/doctor")
    .send({
      specialization: "A",
      experience: 5,
      consultationFee: 1000,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
it("should reject doctor profile with negative experience", async () => {
  const agent = request.agent(app);

  await User.create({
    name: "Test Patient",
    email: "doctor@example.com",
    password: "Test@123456",
    isEmailVerified: true,
  });

  await agent
    .post("/api/v1/auth/login")
    .send({
      email: "doctor@example.com",
      password: "Test@123456",
    });

  const response = await agent
    .post("/api/v1/doctor")
    .send({
      specialization: "Cardiology",
      experience: -1,
      consultationFee: 1000,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
it("should reject doctor profile with negative consultation fee", async () => {
  const agent = request.agent(app);

  await User.create({
    name: "Test Patient",
    email: "doctor@example.com",
    password: "Test@123456",
    isEmailVerified: true,
  });

  await agent
    .post("/api/v1/auth/login")
    .send({
      email: "doctor@example.com",
      password: "Test@123456",
    });

  const response = await agent
    .post("/api/v1/doctor")
    .send({
      specialization: "Cardiology",
      experience: 5,
      consultationFee: -100,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

  
});
describe("Get All Doctors", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should return verified and available doctors", async () => {
    const user = await User.create({
      name: "Dr. Cardio",
      email: "cardio@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 10,
      consultationFee: 1500,
      bio: "Experienced cardiologist",
      clinicAddress: "Delhi",
      qualifications: ["MBBS", "MD"],
      isVerified: true,
      isAvailable: true,
    });

    const response = await request(app)
      .get("/api/v1/doctor");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.doctors).toHaveLength(1);
    expect(response.body.data.doctors[0].specialization).toBe(
      "Cardiology"
    );
  });

  it("should not return unverified doctors", async () => {
    const user = await User.create({
      name: "Dr. Unverified",
      email: "unverified-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });

    await Doctor.create({
      user: user._id,
      specialization: "Dermatology",
      experience: 5,
      consultationFee: 800,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
      isVerified: false,
      isAvailable: true,
    });

    const response = await request(app)
      .get("/api/v1/doctor");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctors).toHaveLength(0);
  });

  it("should not return unavailable doctors", async () => {
    const user = await User.create({
      name: "Dr. Unavailable",
      email: "unavailable@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });

    await Doctor.create({
      user: user._id,
      specialization: "Neurology",
      experience: 8,
      consultationFee: 1200,
      clinicAddress: "Delhi",
      qualifications: ["MBBS", "MD"],
      isVerified: true,
      isAvailable: false,
    });

    const response = await request(app)
      .get("/api/v1/doctor");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctors).toHaveLength(0);
  });

  it("should filter doctors by specialization", async () => {
    const cardioUser = await User.create({
      name: "Dr. Cardio",
      email: "cardio@example.com",
      password: "Test@123456",
    });

    const dermUser = await User.create({
      name: "Dr. Derm",
      email: "derm@example.com",
      password: "Test@123456",
    });

    await Doctor.create([
      {
        user: cardioUser._id,
        specialization: "Cardiology",
        experience: 10,
        consultationFee: 1500,
        clinicAddress: "Delhi",
        qualifications: ["MBBS"],
        isVerified: true,
        isAvailable: true,
      },
      {
        user: dermUser._id,
        specialization: "Dermatology",
        experience: 5,
        consultationFee: 800,
        clinicAddress: "Delhi",
        qualifications: ["MBBS"],
        isVerified: true,
        isAvailable: true,
      },
    ]);

    const response = await request(app)
      .get("/api/v1/doctor")
      .query({ specialization: "cardio" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.doctors).toHaveLength(1);
    expect(response.body.data.doctors[0].specialization).toBe(
      "Cardiology"
    );
  });

  it("should return pagination metadata", async () => {
    const user = await User.create({
      name: "Dr. Cardio",
      email: "pagination@example.com",
      password: "Test@123456",
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 10,
      consultationFee: 1500,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
      isVerified: true,
      isAvailable: true,
    });

    const response = await request(app)
      .get("/api/v1/doctor")
      .query({
        page: 1,
        limit: 10,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.page).toBe(1);
    expect(response.body.data.limit).toBe(10);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.totalPages).toBe(1);
  });
});
describe("Get Doctor By ID", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should return a verified doctor by doctor profile ID", async () => {
    const user = await User.create({
      name: "Dr. Cardio",
      email: "cardio@example.com",
      password: "Test@123456",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 10,
      consultationFee: 1500,
      clinicAddress: "Delhi",
      qualifications: ["MBBS", "MD"],
      isVerified: true,
      isAvailable: true,
    });

    const response = await request(app)
      .get(`/api/v1/doctor/${doctor._id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Doctor fetched successfully"
    );
    expect(response.body.data.specialization).toBe(
      "Cardiology"
    );
  });

  it("should return a verified doctor by linked user ID", async () => {
    const user = await User.create({
      name: "Dr. Cardio",
      email: "cardio@example.com",
      password: "Test@123456",
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 10,
      consultationFee: 1500,
      clinicAddress: "Delhi",
      qualifications: ["MBBS", "MD"],
      isVerified: true,
      isAvailable: true,
    });

    const response = await request(app)
      .get(`/api/v1/doctor/${user._id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.specialization).toBe(
      "Cardiology"
    );
  });

  it("should reject an invalid doctor ID", async () => {
    const response = await request(app)
      .get("/api/v1/doctor/invalid-id");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid doctor ID"
    );
  });

  it("should return 404 when doctor does not exist", async () => {
    const user = await User.create({
      name: "Test User",
      email: "nodoctor@example.com",
      password: "Test@123456",
    });

    const response = await request(app)
      .get(`/api/v1/doctor/${user._id}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor not found"
    );
  });

  it("should reject an unverified doctor", async () => {
    const user = await User.create({
      name: "Dr. Pending",
      email: "pending@example.com",
      password: "Test@123456",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
      isVerified: false,
      isAvailable: true,
    });

    const response = await request(app)
      .get(`/api/v1/doctor/${doctor._id}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor is not verified"
    );
  });
});
describe("Get Logged-in Doctor", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should return the logged-in doctor's profile", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Cardio",
      email: "doctor-me@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 10,
      consultationFee: 1500,
      clinicAddress: "Delhi",
      qualifications: ["MBBS", "MD"],
      isVerified: true,
      isAvailable: true,
    });

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "doctor-me@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .get("/api/v1/doctor/me");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Doctor fetched successfully"
    );

    expect(response.body.data).toBeDefined();
    expect(response.body.data._id).toBe(
      doctor._id.toString()
    );
    expect(response.body.data.specialization).toBe(
      "Cardiology"
    );
  });

  it("should reject unauthenticated access", async () => {
    const response = await request(app)
      .get("/api/v1/doctor/me");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should return 404 when authenticated user has no doctor profile", async () => {
    const agent = request.agent(app);

    await User.create({
      name: "Test Patient",
      email: "patient-me@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "patient-me@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .get("/api/v1/doctor/me");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor profile not found"
    );
  });
});
describe("Update Doctor Profile", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should update the logged-in doctor's profile", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Test",
      email: "update-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      clinicAddress: "Delhi",
      qualifications: ["MBBS"],
      isVerified: true,
      isAvailable: true,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "update-doctor@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor")
      .send({
        specialization: "Neurology",
        experience: 8,
        consultationFee: 1500,
        bio: "Experienced neurologist",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const updatedDoctor = await Doctor.findById(doctor._id);

    expect(updatedDoctor.specialization).toBe("Neurology");
    expect(updatedDoctor.experience).toBe(8);
    expect(updatedDoctor.consultationFee).toBe(1500);
    expect(updatedDoctor.bio).toBe("Experienced neurologist");
  });

  it("should reject updating doctor profile without authentication", async () => {
    const response = await request(app)
      .patch("/api/v1/doctor")
      .send({
        specialization: "Neurology",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject update when doctor profile does not exist", async () => {
    const agent = request.agent(app);

    await User.create({
  name: "Doctor User",
  email: "no-doctor-update@example.com",
  password: "Test@123456",
  isEmailVerified: true,
  roles: ["patient", "doctor"],
  activeRole: "doctor",
});

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "no-doctor-update@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor")
      .send({
        specialization: "Neurology",
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor profile not found"
    );
  });

  it("should reject negative experience", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Test",
      email: "negative-experience@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "negative-experience@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor")
      .send({
        experience: -1,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject negative consultation fee", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Test",
      email: "negative-fee@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "negative-fee@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor")
      .send({
        consultationFee: -100,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
describe("Toggle Doctor Availability", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should toggle doctor availability", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Test",
      email: "availability@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      isAvailable: true,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "availability@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor/availability");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.isAvailable).toBe(false);

    const updatedDoctor = await Doctor.findById(doctor._id);

    expect(updatedDoctor.isAvailable).toBe(false);
  });

  it("should reject availability toggle without authentication", async () => {
    const response = await request(app)
      .patch("/api/v1/doctor/availability");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject availability toggle when doctor profile does not exist", async () => {
    const agent = request.agent(app);

    await User.create({
  name: "Doctor User",
  email: "no-doctor-availability@example.com",
  password: "Test@123456",
  isEmailVerified: true,
  roles: ["patient", "doctor"],
  activeRole: "doctor",
});

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "no-doctor-availability@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor/availability");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor profile not found"
    );
  });
});
describe("Update Slot Availability", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });
  

  it("should update doctor slot availability", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Schedule",
      email: "schedule@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      slotDuration: 30,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "schedule@example.com",
        password: "Test@123456",
      });

    const availability = [
      {
        day: "Monday",
        slots: [
          {
            start: "09:00",
            end: "10:00",
          },
          {
            start: "11:00",
            end: "12:00",
          },
        ],
      },
    ];

    const response = await agent
      .patch("/api/v1/doctor/slot-availability")
      .send({ availability });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Availability updated successfully"
    );

    const updatedDoctor = await Doctor.findById(doctor._id);

    expect(updatedDoctor.availability).toHaveLength(1);
    expect(updatedDoctor.availability[0].day).toBe("Monday");
    expect(updatedDoctor.availability[0].slots).toHaveLength(2);
  });

  it("should reject slot availability when availability is missing", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Schedule",
      email: "missing-availability@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "missing-availability@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor/slot-availability")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Availability must be an array"
    );
  });

  it("should reject slot availability for a user without a doctor profile", async () => {
    const agent = request.agent(app);

   await User.create({
  name: "Doctor User",
  email: "no-doctor-schedule@example.com",
  password: "Test@123456",
  isEmailVerified: true,
  roles: ["patient", "doctor"],
  activeRole: "doctor",
});

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "no-doctor-schedule@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor/slot-availability")
      .send({
        availability: [],
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor profile not found"
    );
  });

  it("should reject overlapping availability slots", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Schedule",
      email: "overlap@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
      slotDuration: 30,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "overlap@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .patch("/api/v1/doctor/slot-availability")
      .send({
        availability: [
          {
            day: "Monday",
            slots: [
              { start: "09:00", end: "10:00" },
              { start: "09:30", end: "11:00" },
            ],
          },
        ],
      });

    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
  });
   it("should reject duplicate days", async () => {
  const agent = await createAuthenticatedDoctor();

  const response = await agent
    .patch("/api/v1/doctor/slot-availability")
    .send({
      availability: [
        {
          day: "Monday",
          slots: [{ start: "09:00", end: "10:00" }],
        },
        {
          day: "Monday",
          slots: [{ start: "11:00", end: "12:00" }],
        },
      ],
    });

  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
});

it("should reject a slot where start time is after end time", async () => {
  const agent = await createAuthenticatedDoctor();

  const response = await agent
    .patch("/api/v1/doctor/slot-availability")
    .send({
      availability: [
        {
          day: "Tuesday",
          slots: [{ start: "11:00", end: "10:00" }],
        },
      ],
    });

  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
});

it("should reject a slot shorter than slotDuration", async () => {
  const agent = await createAuthenticatedDoctor();

  const response = await agent
    .patch("/api/v1/doctor/slot-availability")
    .send({
      availability: [
        {
          day: "Wednesday",
          slots: [{ start: "09:00", end: "09:15" }],
        },
      ],
    });

  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
});

it("should reject an invalid time format", async () => {
    const agent = await createAuthenticatedDoctor();


  const response = await agent
    .patch("/api/v1/doctor/slot-availability")
    .send({
      availability: [
        {
          day: "Thursday",
          slots: [{ start: "9 AM", end: "10 AM" }],
        },
      ],
    });

  expect(response.status).toBe(500);
  expect(response.body.success).toBe(false);
});
 
});
describe("Delete Doctor Profile", () => {
  beforeEach(async () => {
    await Doctor.deleteMany({});
    await User.deleteMany({});
  });

  it("should delete the doctor profile and restore patient role", async () => {
    const agent = request.agent(app);

    const user = await User.create({
      name: "Dr. Delete",
      email: "delete-doctor@example.com",
      password: "Test@123456",
      isEmailVerified: true,
      roles: ["patient", "doctor"],
      activeRole: "doctor",
    });

    const doctor = await Doctor.create({
      user: user._id,
      specialization: "Cardiology",
      experience: 5,
      consultationFee: 1000,
    });

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "delete-doctor@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .delete("/api/v1/doctor");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Doctor profile deleted successfully"
    );

    const deletedDoctor = await Doctor.findById(doctor._id);

    expect(deletedDoctor).toBeNull();

    const updatedUser = await User.findById(user._id);

    expect(updatedUser.roles).toEqual(["patient"]);
    expect(updatedUser.activeRole).toBe("patient");
  });

  it("should reject deleting doctor profile without authentication", async () => {
    const response = await request(app)
      .delete("/api/v1/doctor");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject deletion when doctor profile does not exist", async () => {
    const agent = request.agent(app);
await User.create({
  name: "Doctor User",
  email: "no-doctor-delete@example.com",
  password: "Test@123456",
  isEmailVerified: true,
  roles: ["patient", "doctor"],
  activeRole: "doctor",
});

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "no-doctor-delete@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .delete("/api/v1/doctor");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Doctor profile not found"
    );
  });
});

