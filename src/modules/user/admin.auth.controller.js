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


const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid email or password");
  }
  if(user.activeRole !== UserRoleEnum.ADMIN){ 
    throw new ApiError(401, "You are not authorized to access the admin portal.");

  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
  const createdAdmin = await User.findById(user._id).select(
    "-password -emailVerificationToken -emailVerificationTokenExpiry -refreshToken"
  )
  if (!createdAdmin) {
    throw new ApiError(500, "Some error occurred while fetching user data");

  }
  
  return res
    .status(200)
    .cookie("adminAccessToken", accessToken, getCookieOptions())
    .cookie("adminRefreshToken", refreshToken, getCookieOptions())
    .json(new ApiResponse(200, { user: createdAdmin }, "Login successful"));
})
const logoutAdmin = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.adminRefreshToken;

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
    .clearCookie("adminAccessToken", getCookieOptions())
    .clearCookie("adminRefreshToken", getCookieOptions())
    .json(
      new ApiResponse(200, null, "User logged out successfully")
    );
});
const adminRefreshAccessToken = asyncHandler(async (req, res) => {

  const incomingRefreshToken = req.cookies?.adminRefreshToken;

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
    .cookie("adminAccessToken", accessToken, getCookieOptions())
    .cookie("adminRefreshToken", newRefreshToken, getCookieOptions())
    .json(new ApiResponse(200, null, "Refresh token updated successfully"));
})
const getCurrentAdmin = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
})

export { adminLogin, logoutAdmin, adminRefreshAccessToken, getCurrentAdmin }
