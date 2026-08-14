import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { User } from "../../src/modules/user/user.model.js";

const sendEmailMock = vi.fn().mockResolvedValue({
  messageId: "test-message-id",
});

vi.mock("../../src/utils/email.js", () => ({
  sendEmail: sendEmailMock,
  emailVerificationTemplate: vi.fn(() => "<html>test</html>"),
  passwordResetTemplate: vi.fn(() => "<html>test</html>"),
}));

const { default: app } = await import("../../src/app.js");

describe("Registration", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    sendEmailMock.mockClear();
  });

  it("should register a new user", async () => {
    const user = {
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      password: "Test@123456",
    };

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(user);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("should reject registration with a duplicate email", async () => {
    const user = {
      name: "Test User",
      email: "duplicate@example.com",
      password: "Test@123456",
    };

    const firstResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(user);

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/api/v1/auth/register")
      .send(user);

    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body.success).toBe(false);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
  it("should reject registration with an invalid email", async () => {
  const user = {
    name: "Test User",
    email: "invalid-email",
    password: "Test@123456",
  };

  const response = await request(app)
    .post("/api/v1/auth/register")
    .send(user);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

it("should reject registration with a short password", async () => {
  const user = {
    name: "Test User",
    email: "short-password@example.com",
    password: "12345",
  };

  const response = await request(app)
    .post("/api/v1/auth/register")
    .send(user);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

it("should reject registration without a name", async () => {
  const user = {
    email: "missing-name@example.com",
    password: "Test@123456",
  };

  const response = await request(app)
    .post("/api/v1/auth/register")
    .send(user);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

it("should reject registration without an email", async () => {
  const user = {
    name: "Test User",
    password: "Test@123456",
  };

  const response = await request(app)
    .post("/api/v1/auth/register")
    .send(user);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

it("should reject registration without a password", async () => {
  const user = {
    name: "Test User",
    email: "missing-password@example.com",
  };

  const response = await request(app)
    .post("/api/v1/auth/register")
    .send(user);

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});

});
describe("Login", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    await User.create({
      name: "Test User",
      email: "login@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });
  });
 it("should login a verified user with valid credentials", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "login@example.com",
      password: "Test@123456",
    });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.user).toBeDefined();
  expect(response.headers["set-cookie"]).toBeDefined();
});
it("should return the current user when authenticated", async () => {
  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: "login@example.com",
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  const response = await agent.get("/api/v1/auth/me");

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toBeDefined();
  expect(response.body.data.email).toBe("login@example.com");
});
it("should reject accessing current user without authentication", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me");

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
});
it("should refresh the access token with a valid refresh token", async () => {
  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: "login@example.com",
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  const refreshResponse = await agent
    .post("/api/v1/auth/refresh-token");

  expect(refreshResponse.status).toBe(200);
  expect(refreshResponse.body.success).toBe(true);
  expect(refreshResponse.body.message).toBe(
    "Access token refreshed successfully"
  );
  expect(refreshResponse.headers["set-cookie"]).toBeDefined();
});
it("should reject refresh when refresh token is missing", async () => {
  const response = await request(app)
    .post("/api/v1/auth/refresh-token");

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Refresh token not found");
});
it("should reject an invalid refresh token", async () => {
  const response = await request(app)
    .post("/api/v1/auth/refresh-token")
    .set("Cookie", ["userRefreshToken=invalid-token"]);

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Invalid refresh token");
});
it("should reject a refresh token that does not match the stored token", async () => {
  const agent = request.agent(app);

  const loginResponse = await agent
    .post("/api/v1/auth/login")
    .send({
      email: "login@example.com",
      password: "Test@123456",
    });

  expect(loginResponse.status).toBe(200);

  const user = await User.findOne({
    email: "login@example.com",
  });

  user.refreshToken = "different-refresh-token";
  await user.save({ validateBeforeSave: false });

  const response = await agent
    .post("/api/v1/auth/refresh-token");

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe(
    "Refresh token does not match"
  );
});
it("should reject login with an invalid password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "login@example.com",
      password: "WrongPassword123",
    });

  expect(response.status).toBe(401);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Invalid password");
});
it("should reject login when the user does not exist", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "doesnotexist@example.com",
      password: "Test@123456",
    });

  expect(response.status).toBe(404);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("User not found");
});
it("should reject login when email is not verified", async () => {
  await User.create({
    name: "Unverified User",
    email: "unverified@example.com",
    password: "Test@123456",
    isEmailVerified: false,
  });

  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "unverified@example.com",
      password: "Test@123456",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toBe("Please verify your email");
});
it("should reject login without email", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      password: "Test@123456",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
it("should reject login without password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "login@example.com",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
it("should reject login with an invalid email", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "invalid-email",
      password: "Test@123456",
    });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
});
});
describe("Logout", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    await User.create({
      name: "Test User",
      email: "logout@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });
  });

  it("should logout an authenticated user", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "logout@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    const logoutResponse = await agent
      .post("/api/v1/auth/logout");

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.body.success).toBe(true);
    expect(logoutResponse.body.message).toBe(
      "User logged out successfully"
    );

    const user = await User.findOne({
      email: "logout@example.com",
    });

    expect(user.refreshToken).toBeUndefined();
  });

  it("should reject logout when user is not authenticated", async () => {
    const response = await request(app)
      .post("/api/v1/auth/logout");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("should reject logout when refresh token is missing", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "logout@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    // The agent has both cookies after login.
    // Remove the refresh token by sending only the access token.
    const cookies = loginResponse.headers["set-cookie"];

    const accessTokenCookie = cookies.find((cookie) =>
      cookie.startsWith("userAccessToken=")
    );

    expect(accessTokenCookie).toBeDefined();

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [accessTokenCookie]);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Refresh token not found"
    );
  });
});
describe("Change Password", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    await User.create({
      name: "Test User",
      email: "password@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });
  });

  it("should change password with valid credentials", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "password@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "Test@123456",
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Password changed successfully"
    );
   // Verify the new password actually works
  const loginWithNewPassword = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "password@example.com",
      password: "NewPassword123",
    });

  expect(loginWithNewPassword.status).toBe(200);
  expect(loginWithNewPassword.body.success).toBe(true);
  expect(loginWithNewPassword.body.message).toBe("Login successful");
  });

  it("should reject change password with an invalid current password", async () => {
    const agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/v1/auth/login")
      .send({
        email: "password@example.com",
        password: "Test@123456",
      });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid current password"
    );
  });

  it("should reject change password when current password is missing", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "password@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .post("/api/v1/auth/change-password")
      .send({
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject change password when new password is missing", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "password@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "Test@123456",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject change password when new password is too short", async () => {
    const agent = request.agent(app);

    await agent
      .post("/api/v1/auth/login")
      .send({
        email: "password@example.com",
        password: "Test@123456",
      });

    const response = await agent
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "Test@123456",
        newPassword: "12345",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject change password when user is not authenticated", async () => {
    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .send({
        currentPassword: "Test@123456",
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
describe("Forgot Password", () => {
  beforeEach(async () => {
    await User.deleteMany({});

    await User.create({
      name: "Test User",
      email: "forgot@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });

    sendEmailMock.mockClear();
  });

  it("should send a password reset email for a registered user", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: "forgot@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Password reset email sent successfully"
    );

    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const user = await User.findOne({
      email: "forgot@example.com",
    });

    expect(user.forgotPasswordToken).toBeDefined();
    expect(user.forgotPasswordTokenExpiry).toBeDefined();
  });

  it("should return success for an unknown email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: "unknown@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "If the email exists, a reset link has been sent"
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("should reject forgot password with an invalid email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({
        email: "invalid-email",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("should reject forgot password without an email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
describe("Reset Password", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should reset password with a valid reset token", async () => {
    const user = await User.create({
      name: "Test User",
      email: "reset@example.com",
      password: "OldPassword123",
      isEmailVerified: true,
    });

    const {
      unhashedToken,
      hashedToken,
      tokenExpiry,
    } = user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    const response = await request(app)
      .post(`/api/v1/auth/reset-password/${unhashedToken}`)
      .send({
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Password reset successfully"
    );

    const updatedUser = await User.findOne({
      email: "reset@example.com",
    });

    expect(updatedUser.forgotPasswordToken).toBeUndefined();
    expect(
      updatedUser.forgotPasswordTokenExpiry
    ).toBeUndefined();

    // Verify the new password actually works.
    const loginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "reset@example.com",
        password: "NewPassword123",
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.success).toBe(true);
  });

  it("should reject an invalid reset token", async () => {
    await User.create({
      name: "Test User",
      email: "reset@example.com",
      password: "OldPassword123",
      isEmailVerified: true,
    });

    const response = await request(app)
      .post("/api/v1/auth/reset-password/invalid-token")
      .send({
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid or expired reset token"
    );
  });

  it("should reject an expired reset token", async () => {
    const user = await User.create({
      name: "Test User",
      email: "reset@example.com",
      password: "OldPassword123",
      isEmailVerified: true,
    });

    const {
      unhashedToken,
      hashedToken,
    } = user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = Date.now() - 1000;

    await user.save({ validateBeforeSave: false });

    const response = await request(app)
      .post(`/api/v1/auth/reset-password/${unhashedToken}`)
      .send({
        newPassword: "NewPassword123",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid or expired reset token"
    );
  });

  it("should reject reset password without a new password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/reset-password/some-token")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should reject reset password with a short new password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/reset-password/some-token")
      .send({
        newPassword: "12345",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
describe("Email Verification", () => {
  beforeEach(async () => {
    await User.deleteMany({});
  });

  it("should verify a user's email with a valid token", async () => {
    const user = await User.create({
      name: "Verify User",
      email: "verify@example.com",
      password: "Test@123456",
      isEmailVerified: false,
    });

    const {
      unhashedToken,
      hashedToken,
      tokenExpiry,
    } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiry = tokenExpiry;

    await user.save({ validateBeforeSave: false });

    const response = await request(app)
      .get(`/api/v1/auth/verify-email/${unhashedToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Email verified successfully"
    );

    const verifiedUser = await User.findOne({
      email: "verify@example.com",
    });

    expect(verifiedUser.isEmailVerified).toBe(true);
    expect(verifiedUser.emailVerificationToken).toBeUndefined();
    expect(
      verifiedUser.emailVerificationTokenExpiry
    ).toBeUndefined();
  });

  it("should reject an invalid verification token", async () => {
    await User.create({
      name: "Verify User",
      email: "verify@example.com",
      password: "Test@123456",
      isEmailVerified: false,
    });

    const response = await request(app)
      .get("/api/v1/auth/verify-email/invalid-token");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid or expired verification token"
    );
  });

  it("should reject an expired verification token", async () => {
    const user = await User.create({
      name: "Verify User",
      email: "verify@example.com",
      password: "Test@123456",
      isEmailVerified: false,
    });

    const {
      unhashedToken,
      hashedToken,
    } = user.generateTemporaryToken();

    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiry = Date.now() - 1000;

    await user.save({ validateBeforeSave: false });

    const response = await request(app)
      .get(`/api/v1/auth/verify-email/${unhashedToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Invalid or expired verification token"
    );
  });
});
describe("Resend Email Verification", () => {
  beforeEach(async () => {
    await User.deleteMany({});
    sendEmailMock.mockClear();
  });

  it("should resend verification email for an unverified user", async () => {
    await User.create({
      name: "Resend User",
      email: "resend@example.com",
      password: "Test@123456",
      isEmailVerified: false,
    });

    const response = await request(app)
      .post("/api/v1/auth/resend-email-verification")
      .send({
        email: "resend@example.com",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe(
      "Verification email sent successfully"
    );

    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const user = await User.findOne({
      email: "resend@example.com",
    });

    expect(user.emailVerificationToken).toBeDefined();
    expect(user.emailVerificationTokenExpiry).toBeDefined();
  });

  it("should reject resend verification when email is missing", async () => {
    const response = await request(app)
      .post("/api/v1/auth/resend-email-verification")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Email is required");

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("should reject resend verification for a non-existent user", async () => {
    const response = await request(app)
      .post("/api/v1/auth/resend-email-verification")
      .send({
        email: "unknown@example.com",
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("User not found");

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("should reject resend verification for an already verified user", async () => {
    await User.create({
      name: "Verified User",
      email: "verified@example.com",
      password: "Test@123456",
      isEmailVerified: true,
    });

    const response = await request(app)
      .post("/api/v1/auth/resend-email-verification")
      .send({
        email: "verified@example.com",
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "Email is already verified"
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});