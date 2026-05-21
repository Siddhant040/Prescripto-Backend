import mongoose from "mongoose";
import { Review } from "./review.model.js";
import { mapReviewToDTO, mapReviewsToDTO } from "./review.dto.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import { Appointment } from "../Appointment/appointment.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import {
  APPOINTMENT_STATUS,
  NOTIFICATION_TYPES,
  UserRoleEnum
} from "../../utils/constants.js";
import { createNotification } from "../notification/notification.controller.js";

const reviewPopulate = [
  {
    path: "patient",
    select: "name email avatar"
  },
  {
    path: "doctor",
    select: "user specialization consultationFee rating totalReviews",
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

// create review
const createReview = asyncHandler(async (req, res) => {
  const { appointmentId, review, rating } = req.body;

  if (req.user?.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can create reviews");
  }

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(appointmentId);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (appointment.patient.toString() !== req.user._id.toString()) {
    throw new ApiError(
      403,
      "You can only review appointments that belong to you"
    );
  }

  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
    throw new ApiError(400, "Review is allowed only for completed appointments");
  }

  const existingReview = await Review.findOne({
    appointment: appointment._id,
    patient: req.user._id,
    isDeleted: false
  });

  if (existingReview) {
    throw new ApiError(409, "You have already submitted a review for this appointment");
  }

  let createdReview;

  try {
    createdReview = await Review.create({
      patient: req.user._id,
      doctor: appointment.doctor,
      appointment: appointment._id,
      rating,
      review
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Only one review is allowed per appointment");
    }

    throw error;
  }

  const populatedReview = await createdReview.populate(reviewPopulate);
  await recalculateDoctorRating(createdReview.doctor);
  await createNotification({
    recipient: populatedReview.doctor.user?._id,
    sender: req.user._id,
    type: NOTIFICATION_TYPES.REVIEW_CREATED,
    title: "New review received",
    message: `${populatedReview.patient.name} left a new review for you.`,
    entityId: populatedReview._id,
    entityType: "review"
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      mapReviewToDTO(populatedReview),
      "Review created successfully"
    )
  );
});

const getReviewsByDoctor = asyncHandler(async (req, res) => {
  const { doctorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = {
    doctor: doctorId,
    isDeleted: false
  };

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
      "Doctor reviews fetched successfully"
    )
  );
});

const getReviewsByPatient = asyncHandler(async (req, res) => {
  if (req.user?.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can view their reviews");
  }

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = {
    patient: req.user._id,
    isDeleted: false
  };

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
      "Patient reviews fetched successfully"
    )
  );
});

const getReviewsByid = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid review ID");
  }

  const review = await Review.findOne({
    _id: id,
    isDeleted: false
  }).populate(reviewPopulate);

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  return res.status(200).json(
    new ApiResponse(200, mapReviewToDTO(review), "Review fetched successfully")
  );
});

const updateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, review } = req.body;

  if (req.user?.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can update reviews");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid review ID");
  }

  const existingReview = await Review.findOne({
    _id: id,
    isDeleted: false
  });

  if (!existingReview) {
    throw new ApiError(404, "Review not found");
  }

  if (existingReview.patient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only update your own review");
  }

  if (rating !== undefined) {
    existingReview.rating = rating;
  }

  if (review !== undefined) {
    existingReview.review = review;
  }

  existingReview.isEdited = true;
  await existingReview.save();
  await recalculateDoctorRating(existingReview.doctor);

  const populatedReview = await existingReview.populate(reviewPopulate);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapReviewToDTO(populatedReview),
      "Review updated successfully"
    )
  );
});

const deleteReview = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user?.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can delete reviews");
  }

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

  if (review.patient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only delete your own review");
  }

  review.isDeleted = true;
  await review.save();
  await recalculateDoctorRating(review.doctor);

  return res.status(200).json(
    new ApiResponse(200, null, "Review deleted successfully")
  );
});

export {
  createReview,
  getReviewsByDoctor,
  getReviewsByPatient,
  getReviewsByid,
  updateReview,
  deleteReview
};
