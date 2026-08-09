import mongoose from "mongoose";
import { User } from "../user/user.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { Appointment } from "../Appointment/appointment.model.js";
import { mapAppointmentToDTO } from "../Appointment/appointment.dto.js";
import { Review } from "../review/review.model.js";
import { mapReviewsToDTO } from "../review/review.dto.js";
import { Notification } from "../notification/notification.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import { mapAdminDashboardDTO } from "./admin.dto.js";
import { APPOINTMENT_STATUS } from "../../utils/constants.js";
import {UserRoleEnum} from "../../utils/constants.js";

const appointmentPopulate = [
  {
    path: "doctor",
    select: "user specialization consultationFee",
    populate: {
      path: "user",
      select: "name email avatar"
    }
  },
  {
    path: "patient",
    select: "name email avatar"
  }
];

const reviewPopulate = [
  {
    path: "patient",
    select: "name email avatar"
  },
  {
    path: "doctor",
    select: "user specialization consultationFee rating totalReviews isVerified",
    populate: {
      path: "user",
      select: "name email avatar"
    }
  },
  {
    path: "appointment",
    select: "appointmentDateTime status"
  }
];

const recalculateDoctorRating = async (doctorId) => {
  const stats = await Review.aggregate([
    {
      $match: {
        doctor: new mongoose.Types.ObjectId(doctorId),
        isDeleted: false
      }
    },
    {
      $group: {
        _id: "$doctor",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  const nextRating = stats[0]?.averageRating ?? 0;
  const nextTotalReviews = stats[0]?.totalReviews ?? 0;

  await Doctor.findByIdAndUpdate(doctorId, {
    rating: Number(nextRating.toFixed(1)),
    totalReviews: nextTotalReviews
  });
};

const getAdminDashboard = asyncHandler(async (req, res) => {
  const [
    users,
    doctors,
    verifiedDoctors,
    appointments,
    pendingAppointments,
    completedAppointments,
    reviews,
    activeReviews,
    notifications
  ] = await Promise.all([
    User.countDocuments({
      roles: { $ne: UserRoleEnum.ADMIN },
    }),
    Doctor.countDocuments(),
    Doctor.countDocuments({ isVerified: true }),
    Appointment.countDocuments(),
    Appointment.countDocuments({ status: APPOINTMENT_STATUS.PENDING }),
    Appointment.countDocuments({ status: APPOINTMENT_STATUS.COMPLETED }),
    Review.countDocuments(),
    Review.countDocuments({ isDeleted: false }),
    Notification.countDocuments()
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAdminDashboardDTO({
        users,
        doctors,
        verifiedDoctors,
        appointments,
        pendingAppointments,
        completedAppointments,
        reviews,
        activeReviews,
        notifications
      }),
      "Admin dashboard fetched successfully"
    )
  );
});

const getAllDoctorsForAdmin = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  const { isVerified } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = {};

  if (isVerified === "true") {
    query.isVerified = true;
  } else if (isVerified === "false") {
    query.isVerified = false;
  }

  const [doctors, total] = await Promise.all([
    Doctor.find(query)
      .populate("user", "name email avatar role isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Doctor.countDocuments(query)
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        doctors,
        total,
        page,
        limit
      },
      "Doctors fetched successfully"
    )
  );
});

const verifyDoctorByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  const doctor = await Doctor.findOne({
    $or: [{ _id: id }, { user: id }]
  }).populate("user", "name email avatar");

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  if (doctor.isVerified) {
    throw new ApiError(400, "Doctor is already verified");
  }

  doctor.isVerified = true;
  await doctor.save();

  return res.status(200).json(
    new ApiResponse(200, doctor, "Doctor verified successfully")
  );
});

const getAllAppointmentsForAdmin = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  const { status } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = {};

  if (status) {
    query.status = status;
  }

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate(appointmentPopulate)
      .sort({ appointmentDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query)
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        appointments: appointments.map(mapAppointmentToDTO),
        total,
        page,
        limit
      },
      "Appointments fetched successfully"
    )
  );
});

const getAllReviewsForAdmin = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  const { includeDeleted } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = {};

  if (includeDeleted !== "true") {
    query.isDeleted = false;
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate(reviewPopulate)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(query)
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews: mapReviewsToDTO(reviews),
        total,
        page,
        limit
      },
      "Reviews fetched successfully"
    )
  );
});

const deleteReviewByAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid review ID");
  }

  const review = await Review.findOne({
    _id: id,
    isDeleted: false
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  review.isDeleted = true;
  await review.save();
  await recalculateDoctorRating(review.doctor);

  return res.status(200).json(
    new ApiResponse(200, null, "Review deleted successfully")
  );
});

export {
  getAdminDashboard,
  getAllDoctorsForAdmin,
  verifyDoctorByAdmin,
  getAllAppointmentsForAdmin,
  getAllReviewsForAdmin,
  deleteReviewByAdmin
};
