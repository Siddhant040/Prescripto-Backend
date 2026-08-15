import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

import app from "../../src/app.js";
import { User } from "../../src/modules/user/user.model.js";
describe("Admin Login", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    await User.create({
      name: "Admin",
      email: "admin@example.com",
      password: "Admin@123456",
      isEmailVerified: true,
      roles: ["admin"],
      activeRole: "admin",
    });
  });

  it("should login an admin with valid credentials", async () => {
    const response = await request(app)
      .post("/api/v1/auth2/admin//admin-login")
      .send({
        email: "admin@example.com",
        password: "Admin@123456",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toBeDefined();
    expect(response.headers["set-cookie"]).toBeDefined();
  });
  it("should reject login with an incorrect password", async () => {
  const response = await request(app)
    .post("/api/v1/auth2/admin/admin-login")
    .send({
      email: "admin@example.com",
      password: "WrongPassword123",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Invalid email or password"
  );
});

it("should reject a non-admin user", async () => {
  await User.create({
    name: "Patient",
    email: "patient-admin-test@example.com",
    password: "Test@123456",
    isEmailVerified: true,
    roles: ["patient"],
    activeRole: "patient",
  });

  const response = await request(app)
    .post("/api/v1/auth2/admin/admin-login")
    .send({
      email: "patient-admin-test@example.com",
      password: "Test@123456",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "You are not authorized to access the admin portal."
  );
});

it("should reject login when admin does not exist", async () => {
  const response = await request(app)
    .post("/api/v1/auth2/admin/admin-login")
    .send({
      email: "doesnotexist-admin@example.com",
      password: "Admin@123456",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Invalid email or password"
  );
});
});
describe("Admin Me", () => {
  it("should return the authenticated admin", async () => {
    const agent = request.agent(app);

    const login = await agent
      .post("/api/v1/auth2/admin/admin-login")
      .send({
        email: "admin@example.com",
        password: "Admin@123456",
      });

    expect(login.status).toBe(200);

    const response = await agent
      .get("/api/v1/auth2/admin/me");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.email).toBe("admin@example.com");
  });

  it("should reject unauthenticated admin access", async () => {
    const response = await request(app)
      .get("/api/v1/auth2/admin/me");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
describe("Admin Refresh Token", () => {
  it("should refresh admin access token successfully", async () => {
    const agent = request.agent(app);

    const login = await agent
      .post("/api/v1/auth2/admin/admin-login")
      .send({
        email: "admin@example.com",
        password: "Admin@123456",
      });

    expect(login.status).toBe(200);

    const response = await agent
      .post("/api/v1/auth2/admin/refresh-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Refresh token updated successfully"
    );
    expect(response.headers["set-cookie"]).toBeDefined();
  });

  it("should reject refresh without a refresh token", async () => {
    const response = await request(app)
      .post("/api/v1/auth2/admin/refresh-token");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Refresh token not found"
    );
  });

  it("should reject an invalid refresh token", async () => {
    const response = await request(app)
      .post("/api/v1/auth2/admin/refresh-token")
      .set("Cookie", [
        "adminRefreshToken=invalid-token",
      ]);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid refresh token"
    );
  });
});
describe("Admin Logout", () => {
  it("should logout an authenticated admin", async () => {
    const agent = request.agent(app);

    const login = await agent
      .post("/api/v1/auth2/admin/admin-login")
      .send({
        email: "admin@example.com",
        password: "Admin@123456",
      });

    expect(login.status).toBe(200);

    const response = await agent
      .post("/api/v1/auth2/admin/logout");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "User logged out successfully"
    );
  });

  it("should reject logout without authentication", async () => {
    const response = await request(app)
      .post("/api/v1/auth2/admin/logout");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject logout when refresh token is missing", async () => {
    const agent = request.agent(app);

    const login = await agent
      .post("/api/v1/auth2/admin/admin-login")
      .send({
        email: "admin@example.com",
        password: "Admin@123456",
      });

    expect(login.status).toBe(200);

    // Remove only the refresh token from the agent's cookie jar.
    const cookies = login.headers["set-cookie"];

    const accessCookie = cookies.find((cookie) =>
      cookie.startsWith("adminAccessToken=")
    );

    const response = await request(app)
      .post("/api/v1/auth2/admin/logout")
      .set("Cookie", [accessCookie]);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Refresh token not found"
    );
  });
});