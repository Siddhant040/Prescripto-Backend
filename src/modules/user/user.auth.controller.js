import { User } from "./user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import { ApiError } from "../../errors/apiError.js";   // Import the ApiResponse class from your errors api
import { passwordResetTemplate, emailVerificationTemplate, sendEmail } from "../../utils/email.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { uploadToCloudinary } from "../../utils/cloudinaryUpload.js";
import { UserRoleEnum } from "../../utils/constants.js";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
});


const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new ApiError(400, "User already exists");
  }
  const user = await User.create({ name, email, password });
  const { unhashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;
  await user.save();

  // Send verification email
  const verificationUrl = `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unhashedToken}`
  const html = emailVerificationTemplate(verificationUrl, user.name);
  await sendEmail({
    to: user.email,
    subject: "Email Verification",
    html,
  });

  res.status(201).json(new ApiResponse(201, null, "User registered successfully"));
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }
  if (!user.isEmailVerified) {
    throw new ApiError(400, "Please verify your email");

  }
  const allowedRoles = [
  UserRoleEnum.PATIENT,
  UserRoleEnum.DOCTOR,
];

if (!allowedRoles.includes(user.activeRole)) {
  throw new ApiError(
    403,
    "You are not authorized to access the user portal."
  );
}
   
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const createdUser = await User.findById(user._id).select(
    "-password -emailVerificationToken -emailVerificationTokenExpiry -refreshToken"
  )
  if (!createdUser) {
    throw new ApiError(500, "Some error occurred while fetching user data");

  }

  return res
    .status(200)
    .cookie("userAccessToken", accessToken, getCookieOptions())
    .cookie("userRefreshToken", refreshToken, getCookieOptions())
    .json(new ApiResponse(200, { user: createdUser }, "Login successful"));

})

const logoutUser = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError(400, "Refresh token not found");
  }

  // remove refresh token from DB
  await User.findOneAndUpdate(
    { refreshToken },
    { $unset: { refreshToken: 1 } }
  );

  return res
    .status(200)
    .clearCookie("accessToken", getCookieOptions())
    .clearCookie("refreshToken", getCookieOptions())
    .json(
      new ApiResponse(200, null, "User logged out successfully")
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token not found");
  }

  let decodedToken;
  try {
    decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(decodedToken._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token does not match");
  }
  const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .cookie("accessToken", accessToken, getCookieOptions())
    .cookie("refreshToken", newRefreshToken, getCookieOptions())
    .json(new ApiResponse(200, null, "Access token refreshed successfully"));


})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
})

const uploadUserAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "Avatar file is required");
  }

  const uploadResult = await uploadToCloudinary(req.file.buffer);

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { avatar: uploadResult.secure_url },
    {
      new: true,
      runValidators: true,
    }
  ).select("-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { avatar: user.avatar }, "Avatar uploaded successfully"));
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params
  if (!token) {
    throw new ApiError(400, "Verification token is required");
  }
  // Generate a random token (unhashed)
  let hashedToken = crypto
    .createHash("sha256")
    .update(token) // Use the unhashed token as input
    .digest("hex") // Convert to a hex string

  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationTokenExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Invalid or expired verification token");
  }
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Email verified successfully"));
})

const resendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new ApiError(409, "Email is already verified");
  }

  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  const verificationUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/verify-email/${unhashedToken}`;

  const html = emailVerificationTemplate(
    verificationUrl,
    user.name
  );

  await sendEmail({
    to: user.email,
    subject: "Resend Email Verification",
    html,
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Verification email sent successfully")
  );
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json(
      new ApiResponse(200, null, "If the email exists, a reset link has been sent")
    );
  }

  const { unhashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordTokenExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });
  const resetUrl =
    `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unhashedToken}`;

  const html = passwordResetTemplate(resetUrl, user.name);

  await sendEmail({
    to: user.email,
    subject: "Password Reset",
    html,
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Password reset email sent successfully")
  );
});


const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  if (!token) {
    throw new ApiError(400, "Reset token is required");
  }
  if (!newPassword) {
    throw new ApiError(400, "New password is required");
  }
  let hashedToken = crypto
    .createHash("sha256")
    .update(token) // Use the unhashed token as input
    .digest("hex") // Convert to a hex string

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordTokenExpiry: { $gt: Date.now() },
  });
  if (!user) {
    throw new ApiError(400, "Invalid or expired reset token");
  }
  user.password = newPassword;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Password reset successfully"));
})

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Both passwords are required");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid current password");
  }

  user.password = newPassword;

  await user.save(); // keep validation

  return res.status(200).json(
    new ApiResponse(200, {}, "Password changed successfully")
  );
});

const updateUserprofile = asyncHandler(async (req, res) => {
  const { name,phone, address,gender,dateOfBirth  } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  } 

 if (name !== undefined) user.name = name;
if (phone !== undefined) user.phone = phone;
if (address !== undefined) user.address = address;
if (gender !== undefined) user.gender = gender;
if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, null, "User profile updated successfully")
  );
});

const userActiveRole = asyncHandler(async (req, res) => {
  const { activeRole } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");

  }

   // Check requested role is one the user actually has
  if (!user.roles.includes(activeRole)) {
    throw new ApiError(
      403,
      "You don't have permission to switch to this role"
    );
  }
  user.activeRole = activeRole;
  await user.save({ validateBeforeSave: false });

   // Generate new access token because activeRole changed
  const accessToken = user.generateAccessToken();

  return res
    .status(200)
    .cookie("accessToken", accessToken, getCookieOptions())
    .json(
      new ApiResponse(
        200,
        {
          user,
        },
        "Active role updated successfully"
      )
    );
});

 













export {
  registerUser,
  loginUser,
  logoutUser,
  

  refreshAccessToken,

  getCurrentUser,
  uploadUserAvatar,
  updateUserprofile,

  verifyEmail,
  resendEmailVerification,

  forgotPassword,
  resetPassword,
  changePassword,

  userActiveRole

}
