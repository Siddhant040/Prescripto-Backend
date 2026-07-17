import { ApiError } from "../errors/apiError.js";
import { AvailableRole } from "../utils/constants.js";

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {

    // 1. Auth check
    if (!req.user) {
      throw new ApiError(401, "Unauthorized - login required");
    }

    // 2. Roles existence check
    if (!req.user.roles || req.user.roles.length === 0) {
      throw new ApiError(500, "User roles not defined");
    }

    // 3. Validate allowedRoles input
    const invalidRoles = allowedRoles.filter(
      (role) => !AvailableRole.includes(role)
    );

    if (invalidRoles.length > 0) {
      throw new ApiError(500, `Invalid role(s): ${invalidRoles.join(", ")}`);
    }

    // 4. Authorization check
    const hasRole = req.user.roles.some((role) =>
      allowedRoles.includes(role)
    );

    if (!hasRole) {
      throw new ApiError(
        403,
        `Forbidden: requires role ${allowedRoles.join(", ")}`
      );
    }

    next();
  };
};



