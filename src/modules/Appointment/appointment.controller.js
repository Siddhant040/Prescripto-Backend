import { Appointment } from "./appointment.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import mongoose from "mongoose";
import { mapAppointmentToDTO } from "./appointment.dto.js";
import { APPOINTMENT_STATUS, AvailableAppointmentStatus } from "../../utils/constants.js";

// ================= CREATE =================
const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDateTime } = req.body;
  const patientId = req.user._id;

  if (req.user.role !== "patient") {
    throw new ApiError(403, "Only patients can book appointments");
  }

  if (!doctorId || !appointmentDateTime) {
    throw new ApiError(400, "Required fields missing");
  }

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  const appointmentDate = new Date(appointmentDateTime);

  if (isNaN(appointmentDate.getTime())) {
    throw new ApiError(400, "Invalid appointment date/time");
  }

  if (appointmentDate <= new Date()) {
    throw new ApiError(400, "Appointment must be in the future");
  }

  const doctor = await Doctor.findOne({
    $or: [{ _id: doctorId }, { user: doctorId }]
  });

  if (!doctor) throw new ApiError(404, "Doctor not found");
  if (!doctor.isVerified) throw new ApiError(403, "Doctor is not verified");
  if (!doctor.isAvailable) throw new ApiError(403, "Doctor is not available");

  const existingAppointment = await Appointment.findOne({
    doctor: doctor._id,
    appointmentDateTime: appointmentDate,
    status: APPOINTMENT_STATUS.PENDING
  });

  if (existingAppointment) {
    throw new ApiError(409, "Slot already booked");
  }

  try {
    let appointment = await Appointment.create({
      doctor: doctor._id,
      patient: patientId,
      appointmentDateTime: appointmentDate,
      status: APPOINTMENT_STATUS.PENDING
    });

    // 🔥 Populate before DTO
    appointment = await appointment.populate([
      { path: "doctor", select: "name specialization consultationFee avatar" },
      { path: "patient", select: "name email avatar" }
    ]);

    const dto = mapAppointmentToDTO(appointment);

    return res.status(201).json(
      new ApiResponse(201, dto, "Appointment created successfully")
    );

  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Slot already booked");
    }
    throw error;
  }
});


// ================= PATIENT LIST =================
const getAppointmentsForUser = asyncHandler(async (req, res) => {
  if (req.user.role !== "patient") {
    throw new ApiError(403, "Only patients can view their appointments");
  }

  const patientId = req.user._id;

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1 || limit > 50) limit = 10;

  const query = { patient: patientId };

  const appointments = await Appointment.find(query)
    .populate("doctor", "name specialization consultationFee avatar")
    .sort({ appointmentDateTime: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const dtoList = appointments.map(mapAppointmentToDTO);
  const total = await Appointment.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(200, {
      appointments: dtoList,
      total,
      page,
      limit
    }, "Appointments fetched successfully")
  );
});


// ================= DOCTOR LIST =================
const getAppointmentsForDoctor = asyncHandler(async (req, res) => {
  if (req.user.role !== "doctor") {
    throw new ApiError(403, "Only doctors can view their appointments");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) throw new ApiError(404, "Doctor profile not found");
  if (!doctor.isVerified) throw new ApiError(403, "Doctor is not verified");

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1 || limit > 50) limit = 10;

  const query = { doctor: doctor._id };

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate("patient", "name avatar email")
      .sort({ appointmentDateTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query)
  ]);

  const dtoList = appointments.map(mapAppointmentToDTO);

  return res.status(200).json(
    new ApiResponse(200, {
      appointments: dtoList,
      total,
      page,
      limit
    }, "Appointments fetched successfully")
  );
});


// ================= GET BY ID =================
const getAppointmentsById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id)
    .populate("doctor", "name specialization consultationFee avatar")
    .populate("patient", "name email");

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  // Ownership check
  if (req.user.role === "patient" &&
      appointment.patient._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Forbidden");
  }

  if (req.user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor || doctor._id.toString() !== appointment.doctor._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }
  }

  const dto = mapAppointmentToDTO(appointment);

  return res.status(200).json(
    new ApiResponse(200, dto, "Appointment fetched successfully")
  );
});


// ================= UPDATE STATUS =================
const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!AvailableAppointmentStatus.includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  if (req.user.role !== "doctor") {
    throw new ApiError(403, "Only doctors can update appointment status");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) throw new ApiError(404, "Appointment not found");

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const allowedTransitions = {
    [APPOINTMENT_STATUS.PENDING]: [
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.CONFIRMED]: [
      APPOINTMENT_STATUS.COMPLETED
    ],
    [APPOINTMENT_STATUS.COMPLETED]: [],
    [APPOINTMENT_STATUS.CANCELLED]: []
  };

  if (!allowedTransitions[appointment.status].includes(status)) {
    throw new ApiError(400, `Invalid transition`);
  }

  appointment.status = status;
  await appointment.save();

  return res.status(200).json(
    new ApiResponse(200, appointment, "Status updated")
  );
});


// ================= CANCEL =================
const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id);
  if (!appointment) throw new ApiError(404, "Appointment not found");

  if (req.user.role === "patient") {
    if (appointment.patient.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }

    if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
      throw new ApiError(400, "Only pending appointments can be cancelled");
    }
  }

  else if (req.user.role === "doctor") {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }

    if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
      throw new ApiError(400, "Completed appointments cannot be cancelled");
    }
  }

  else if (req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized");
  }

  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  await appointment.save();

  return res.status(200).json(
    new ApiResponse(200, appointment, "Appointment cancelled successfully")
  );
});


// ================= EXPORT =================
export {
  createAppointment,
  getAppointmentsForUser,
  getAppointmentsForDoctor,
  getAppointmentsById,
  updateAppointmentStatus,
  cancelAppointment
};
