import { Doctor } from "./doctor.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import { UserRoleEnum } from "../../utils/constants.js";
import { User } from "../user/user.model.js";
import mongoose from "mongoose";
import {Review} from "../review/review.model.js";

const updateAvailability = asyncHandler(async (req, res) => {
  const { availability } = req.body;

  if (!availability || !Array.isArray(availability)) {
    throw new ApiError(400, "Availability must be an array");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    throw new ApiError(404, "Doctor profile not found");
  }

  doctor.availability = availability;

  await doctor.save(); // 🔥 triggers your validations

  return res.status(200).json(
    new ApiResponse(200, doctor, "Availability updated successfully")
  );
});


const createDoctorProfile = asyncHandler(async (req, res) => {

  // get input from request body
  const { specialization, experience, consultationFee, bio, clinicAddress, qualifications } = req.body
  //basic validation
  if (!specialization || experience === null || consultationFee === null || !qualifications || !clinicAddress) {
    throw new ApiError(400, "Required fields missing");
  }
  //normalize number fields
  const normalizedExperience = Number(experience);
  const normalizedFee = Number(consultationFee);
  if (isNaN(normalizedExperience) || isNaN(normalizedFee) || normalizedExperience < 0 || normalizedFee < 0) {
    throw new ApiError(400, "Experience and consultation fee must be valid <positive></positive> numbers");
  }
  //prevent duplicate profile creation
  const existingDoctor = await Doctor.findOne({ user: req.user._id });
  if (existingDoctor) {
    throw new ApiError(409, "Doctor profile already exists");
  }
  //create doctor profile

  const doctor = await Doctor.create({
    user: req.user._id,
    specialization,
    experience: normalizedExperience,
    consultationFee: normalizedFee,
    bio,
    clinicAddress,
    qualifications
  });
  // Upgrade user to doctor while keeping patient role

  const user = await User.findById(req.user._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!user.roles.includes(UserRoleEnum.DOCTOR)) {
    user.roles.push(UserRoleEnum.DOCTOR);
  }

  user.activeRole = UserRoleEnum.DOCTOR;

  await user.save();

  //return response

  return res.status(201).json(new ApiResponse(201, doctor, "Doctor profile created successfully"));

})

const getAllDoctors = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  const { specialization } = req.query;

  // Sanitize inputs
  page = Number(page) > 0 ? Number(page) : 1;
  limit = Number(limit) > 0 ? Number(limit) : 10;
  limit = Math.min(limit, 50);

  // Base filter
  const filter = {
    isVerified: true,
    isAvailable: true,
  };

  // Specialization filter
  if (specialization) {
    filter.specialization = {
      $regex: specialization,
      $options: "i",
    };
  }

  // Fetch doctors
  const doctors = await Doctor.find(filter)
    .populate("user", "name avatar")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  // Fetch reviews for all doctors in one query
  const doctorIds = doctors.map((doctor) => doctor._id);

  const reviews = await Review.find({
    doctor: { $in: doctorIds },
    isDeleted: false,
  })
    .populate("patient", "name avatar")
    .select("doctor patient rating review createdAt");

  // Create doctorId -> reviews[] map
  const reviewMap = new Map();

  for (const review of reviews) {
    const doctorId = review.doctor.toString();

    if (!reviewMap.has(doctorId)) {
      reviewMap.set(doctorId, []);
    }

    reviewMap.get(doctorId).push(review);
  }

  // Attach reviews to each doctor
  const doctorList = doctors.map((doctor) => {
    const doctorObject = doctor.toObject();

    doctorObject.reviews =
      reviewMap.get(doctor._id.toString()) ?? [];

    return doctorObject;
  });

  // Total count
  const totalDoctors = await Doctor.countDocuments(filter);

  const totalPages = Math.ceil(totalDoctors / limit);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        total: totalDoctors,
        page,
        totalPages,
        limit,
        doctors: doctorList,
      },
      "Doctors fetched successfully"
    )
  );
});
const getDoctorById = asyncHandler(async (req, res) => {

  const { id } = req.params;

  // 1. Validate ID format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  // 2. Support lookup by either doctor profile id or linked user id
  const doctor = await Doctor.findOne({
    $or: [{ _id: id }, { user: id }]
  })
    .populate("user", "name email avatar");

  // 3. Check existence
  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  // 4. Optional: ensure only verified doctors are visible
  if (!doctor.isVerified) {
    throw new ApiError(403, "Doctor is not verified");
  }

  // 5. Response
  return res.status(200).json(
    new ApiResponse(200, doctor, "Doctor fetched successfully")
  );
});

const updateDoctorProfile = asyncHandler(async (req, res) => {

  // 1. Find doctor linked to logged-in user
  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    throw new ApiError(404, "Doctor profile not found");
  }

  // 2. Define allowed fields (VERY IMPORTANT)
  const allowedFields = [
    "specialization",
    "experience",
    "consultationFee",
    "bio",
    "clinicAddress",
    "qualifications"
  ];

  // 3. Update only allowed fields
  Object.keys(req.body).forEach((key) => {
    if (allowedFields.includes(key)) {

      // handle numbers safely
      if (key === "experience" || key === "consultationFee") {
        const value = Number(req.body[key]);

        if (isNaN(value) || value < 0) {
          throw new ApiError(400, `${key} must be a non-negative number`);
        }

        doctor[key] = value;
      } else {
        doctor[key] = req.body[key];
      }
    }
  });

  // 4. Save changes
  await doctor.save();

  // 5. Response
  return res.status(200).json(
    new ApiResponse(200, doctor, "User profile updated successfully")
  );
});
const deleteDoctorProfile = asyncHandler(async (req, res) => {

  // 1. Find doctor linked to logged-in user
  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    throw new ApiError(404, "Doctor profile not found");
  }

  // 2. Delete doctor document
  await doctor.deleteOne();

  // 3. Downgrade user role back to patient
 req.user.activeRole = UserRoleEnum.PATIENT;

req.user.roles = req.user.roles.filter(
    role => role !== UserRoleEnum.DOCTOR
);

await req.user.save();

  // 4. Response
  return res.status(200).json(
    new ApiResponse(200, null, "Doctor profile deleted successfully")
  );
});
const toggleDoctorAvailability = asyncHandler(async (req, res) => {

  // 1. Find doctor linked to logged-in user
  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    throw new ApiError(404, "Doctor profile not found");
  }

  // 2. Toggle availability
  doctor.isAvailable = !doctor.isAvailable;

  // 3. Save changes
  await doctor.save();

  // 4. Response
  return res.status(200).json(
    new ApiResponse(
      200,
      { isAvailable: doctor.isAvailable },
      `Doctor is now ${doctor.isAvailable ? "available" : "unavailable"}`
    )
  );
});
const verifyDoctorProfile = asyncHandler(async (req, res) => {

  const { id } = req.params;

  // 1. Validate ID
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  // 2. Find doctor by either doctor profile id or linked user id
  const doctor = await Doctor.findOne({
    $or: [{ _id: id }, { user: id }]
  });

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  // 3. Check if already verified
  if (doctor.isVerified) {
    throw new ApiError(400, "Doctor is already verified");
  }

  // 4. Verify doctor
  doctor.isVerified = true;
  await doctor.save();

  // 5. Response
  return res.status(200).json(
    new ApiResponse(200, doctor, "Doctor verified successfully")
  );
});
const getLoginDoctor = asyncHandler(async (req, res) => {

  // 1. Find doctor linked to logged-in user
  const doctor = await Doctor.findOne(
    { user: req.user._id }
  ).populate("user");

  if (!doctor) {
    throw new ApiError(404, "Doctor profile not found");
  }

  // 2. Response
  return res.status(200).json(
    new ApiResponse(200, doctor, "Doctor fetched successfully")
  );
})



export {
  createDoctorProfile,
  getAllDoctors,
  getDoctorById,
  updateDoctorProfile,
  deleteDoctorProfile,
  toggleDoctorAvailability,
  verifyDoctorProfile,
  updateAvailability,
  getLoginDoctor


}
