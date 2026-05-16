import { Appointment } from "./appointment.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import mongoose from "mongoose";
import { mapAppointmentToDTO } from "./appointment.dto.js";
import {
  APPOINTMENT_STATUS,
  AvailableAppointmentStatus,
  UserRoleEnum
} from "../../utils/constants.js";
import { generateSlots, filterBookedSlots } from "../Slot/slot.service.js";

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

const findDoctorByLookupId = async (doctorId) => {
  return Doctor.findOne({
    $or: [{ _id: doctorId }, { user: doctorId }]
  });
};

const getBookedAppointmentsForDay = async (
  doctorId,
  date,
  excludeAppointmentId
) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const query = {
    doctor: doctorId,
    appointmentDateTime: { $gte: start, $lte: end },
    status: { $ne: APPOINTMENT_STATUS.CANCELLED }
  };

  if (excludeAppointmentId) {
    query._id = { $ne: excludeAppointmentId };
  }

  return Appointment.find(query).select("appointmentDateTime");
};

const ensureSlotAvailable = async (
  doctor,
  appointmentDate,
  excludeAppointmentId
) => {
  const allSlots = generateSlots(appointmentDate, doctor);

  const isValidSlot = allSlots.some(
    (slot) => slot.getTime() === appointmentDate.getTime()
  );

  if (!isValidSlot) {
    throw new ApiError(400, "Invalid slot selected");
  }

  const appointments = await getBookedAppointmentsForDay(
    doctor._id,
    appointmentDate,
    excludeAppointmentId
  );

  const availableSlots = filterBookedSlots(allSlots, appointments);

  const isStillAvailable = availableSlots.some(
    (slot) => slot.getTime() === appointmentDate.getTime()
  );

  if (!isStillAvailable) {
    throw new ApiError(409, "Slot already booked");
  }
};

const populateAppointment = async (appointment) => {
  return appointment.populate(appointmentPopulate);
};

const getAvailableSlots = asyncHandler(async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    throw new ApiError(400, "doctorId and date are required");
  }

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  const requestedDate = new Date(date);

  if (Number.isNaN(requestedDate.getTime())) {
    throw new ApiError(400, "Invalid date");
  }

  const doctor = await findDoctorByLookupId(doctorId);

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  if (!doctor.isAvailable) {
    throw new ApiError(403, "Doctor not available");
  }

  const allSlots = generateSlots(requestedDate, doctor);
  const appointments = await getBookedAppointmentsForDay(
    doctor._id,
    requestedDate
  );
  const availableSlots = filterBookedSlots(allSlots, appointments);

  return res.status(200).json(
    new ApiResponse(200, availableSlots, "Available slots fetched")
  );
});

const createAppointment = asyncHandler(async (req, res) => {
  const { doctorId, appointmentDateTime } = req.body;
  const patientId = req.user._id;

  if (req.user.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can book appointments");
  }

  if (!doctorId || !appointmentDateTime) {
    throw new ApiError(400, "Required fields missing");
  }

  if (!mongoose.Types.ObjectId.isValid(doctorId)) {
    throw new ApiError(400, "Invalid doctor ID");
  }

  const appointmentDate = new Date(appointmentDateTime);

  if (Number.isNaN(appointmentDate.getTime())) {
    throw new ApiError(400, "Invalid appointment date/time");
  }

  if (appointmentDate <= new Date()) {
    throw new ApiError(400, "Appointment must be in the future");
  }

  const doctor = await findDoctorByLookupId(doctorId);

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  if (!doctor.isVerified) {
    throw new ApiError(403, "Doctor is not verified");
  }

  if (!doctor.isAvailable) {
    throw new ApiError(403, "Doctor is not available");
  }

  await ensureSlotAvailable(doctor, appointmentDate);

  try {
    let appointment = await Appointment.create({
      doctor: doctor._id,
      patient: patientId,
      appointmentDateTime: appointmentDate,
      status: APPOINTMENT_STATUS.PENDING
    });

    appointment = await populateAppointment(appointment);

    return res.status(201).json(
      new ApiResponse(
        201,
        mapAppointmentToDTO(appointment),
        "Appointment created successfully"
      )
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Slot already booked");
    }

    throw error;
  }
});

const getAppointmentsForUser = asyncHandler(async (req, res) => {
  if (req.user.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can view their appointments");
  }

  const patientId = req.user._id;

  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = { patient: patientId };

  const appointments = await Appointment.find(query)
    .populate(appointmentPopulate)
    .sort({ appointmentDateTime: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const dtoList = appointments.map(mapAppointmentToDTO);
  const total = await Appointment.countDocuments(query);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        appointments: dtoList,
        total,
        page,
        limit
      },
      "Appointments fetched successfully"
    )
  );
});

const getAppointmentsForDoctor = asyncHandler(async (req, res) => {
  if (req.user.role !== UserRoleEnum.DOCTOR) {
    throw new ApiError(403, "Only doctors can view their appointments");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor) {
    throw new ApiError(404, "Doctor profile not found");
  }

  if (!doctor.isVerified) {
    throw new ApiError(403, "Doctor is not verified");
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

  const query = { doctor: doctor._id };

  const [appointments, total] = await Promise.all([
    Appointment.find(query)
      .populate(appointmentPopulate)
      .sort({ appointmentDateTime: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Appointment.countDocuments(query)
  ]);

  const dtoList = appointments.map(mapAppointmentToDTO);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        appointments: dtoList,
        total,
        page,
        limit
      },
      "Appointments fetched successfully"
    )
  );
});

const getAppointmentsById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id).populate(
    appointmentPopulate
  );

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (
    req.user.role === UserRoleEnum.PATIENT &&
    appointment.patient._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Forbidden");
  }

  if (req.user.role === UserRoleEnum.DOCTOR) {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor || doctor._id.toString() !== appointment.doctor._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAppointmentToDTO(appointment),
      "Appointment fetched successfully"
    )
  );
});

const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { appointmentDateTime } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (req.user.role === UserRoleEnum.PATIENT) {
    if (appointment.patient.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }
  } else if (req.user.role !== UserRoleEnum.ADMIN) {
    throw new ApiError(403, "Unauthorized");
  }

  if (
    appointment.status === APPOINTMENT_STATUS.CANCELLED ||
    appointment.status === APPOINTMENT_STATUS.COMPLETED
  ) {
    throw new ApiError(400, "Only active appointments can be rescheduled");
  }

  const nextAppointmentDate = new Date(appointmentDateTime);

  if (Number.isNaN(nextAppointmentDate.getTime())) {
    throw new ApiError(400, "Invalid appointment date/time");
  }

  if (nextAppointmentDate <= new Date()) {
    throw new ApiError(400, "Appointment must be in the future");
  }

  const doctor = await Doctor.findById(appointment.doctor);

  if (!doctor) {
    throw new ApiError(404, "Doctor not found");
  }

  if (!doctor.isVerified) {
    throw new ApiError(403, "Doctor is not verified");
  }

  if (!doctor.isAvailable) {
    throw new ApiError(403, "Doctor is not available");
  }

  await ensureSlotAvailable(doctor, nextAppointmentDate, appointment._id);

  try {
    appointment.appointmentDateTime = nextAppointmentDate;
    appointment.status = APPOINTMENT_STATUS.PENDING;
    await appointment.save();

    const populatedAppointment = await populateAppointment(appointment);

    return res.status(200).json(
      new ApiResponse(
        200,
        mapAppointmentToDTO(populatedAppointment),
        "Appointment rescheduled successfully"
      )
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Slot already booked");
    }

    throw error;
  }
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!AvailableAppointmentStatus.includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  if (req.user.role !== UserRoleEnum.DOCTOR) {
    throw new ApiError(403, "Only doctors can update appointment status");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const allowedTransitions = {
    [APPOINTMENT_STATUS.PENDING]: [
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.CANCELLED
    ],
    [APPOINTMENT_STATUS.CONFIRMED]: [APPOINTMENT_STATUS.COMPLETED],
    [APPOINTMENT_STATUS.COMPLETED]: [],
    [APPOINTMENT_STATUS.CANCELLED]: []
  };

  if (!allowedTransitions[appointment.status].includes(status)) {
    throw new ApiError(400, "Invalid transition");
  }

  appointment.status = status;
  await appointment.save();

  const populatedAppointment = await populateAppointment(appointment);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAppointmentToDTO(populatedAppointment),
      "Status updated"
    )
  );
});

const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (req.user.role === UserRoleEnum.PATIENT) {
    if (appointment.patient.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }

    if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
      throw new ApiError(400, "Only pending appointments can be cancelled");
    }
  } else if (req.user.role === UserRoleEnum.DOCTOR) {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }

    if (appointment.status === APPOINTMENT_STATUS.COMPLETED) {
      throw new ApiError(400, "Completed appointments cannot be cancelled");
    }
  } else if (req.user.role !== UserRoleEnum.ADMIN) {
    throw new ApiError(403, "Unauthorized");
  }

  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  await appointment.save();

  const populatedAppointment = await populateAppointment(appointment);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAppointmentToDTO(populatedAppointment),
      "Appointment cancelled successfully"
    )
  );
});

export {
  createAppointment,
  getAppointmentsForUser,
  getAppointmentsForDoctor,
  getAppointmentsById,
  rescheduleAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  getAvailableSlots
};
