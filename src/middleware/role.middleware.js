import { ApiError } from "../errors/apiError.js";
import { AvailableRole } from "../utils/constants.js";

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {

    // 1. Auth check
    if (!req.user) {
      throw new ApiError(401, "Unauthorized - login required");
    }

    // 2. Role existence check
    if (!req.user.role) {
      throw new ApiError(500, "User role not defined");
    }

    // 3. Validate allowedRoles input (NEW)
    const invalidRoles = allowedRoles.filter(
      (role) => !AvailableRole.includes(role)
    );

    if (invalidRoles.length > 0) {
      throw new ApiError(500, `Invalid role(s): ${invalidRoles.join(", ")}`);
    }

    // 4. Authorization check
    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Forbidden: requires role ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
};



