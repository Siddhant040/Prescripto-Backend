import { asyncHandler } from "../../utils/asyncHandler.js";
import { Doctor } from "../doctor/doctor.model.js";
import { Appointment } from "../Appointment/appointment.model.js";
import { User } from "../user/user.model.js";
import { UserRoleEnum } from "../../utils/constants.js";
import { ApiResponse } from "../../errors/apiResponse.js";
export const getHomepageStats = asyncHandler(async (req, res) => {
  const [
    totalDoctors,
    totalAppointments,
    totalPatients,
    specializations,
  ] = await Promise.all([
    Doctor.countDocuments({
      isVerified: true,
      isAvailable: true,
    }),
    Appointment.countDocuments(),
    User.countDocuments({
      activeRole: UserRoleEnum.PATIENT,
    }),
    Doctor.distinct("specialization"),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalDoctors,
        totalAppointments,
        totalPatients,
        totalSpecializations: specializations.length,
      },
      "Homepage stats fetched successfully"
    )
  );
});