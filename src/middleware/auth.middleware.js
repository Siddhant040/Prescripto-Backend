import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../errors/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../modules/user/user.model.js";

export const authMiddleware = asyncHandler(async (req, res, next) => {
  console.log("USER middleware ->", req.method, req.originalUrl);
  const accessToken = req.cookies?.userAccessToken;

  if (!accessToken) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  try {
    
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
    );

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    
    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
});

export const authMiddlewareAdmin = asyncHandler(async (req, res, next) => {
    console.log("ADMIN middleware ->", req.method, req.originalUrl);
  const accessToken = req.cookies?.adminAccessToken;

  if (!accessToken) {
    throw new ApiError(401, "Unauthorized: No token provided");
  }

  try {
    
    const decoded = jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET
    );

    
    const user = await User.findById(decoded._id).select(
      "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
    );

    if (!user) {
      throw new ApiError(401, "User not found");
    }

    
    req.user = user;

    next();
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }
});
