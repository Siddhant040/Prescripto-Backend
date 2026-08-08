import { Appointment } from "./appointment.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import { Payment } from "../payment/payment.model.js";

import mongoose from "mongoose";
import { mapAppointmentToDTO } from "./appointment.dto.js";
import {
  APPOINTMENT_STATUS,
  NOTIFICATION_TYPES,
  AvailableAppointmentStatus,
  UserRoleEnum
} from "../../utils/constants.js";
import { generateSlots, filterBookedSlots } from "../Slot/slot.service.js";
import { createNotification } from "../notification/notification.controller.js";
import { Review } from "../review/review.model.js";

const appointmentPopulate = [
  {
    path: "doctor",
    select: "user specialization consultationFee clinicAddress",
    populate: {
      path: "user",
      select: "name email avatar "
    }
  },
  {
    path: "patient",
    select: "name email phone address dateOfBirth gender avatar" 
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

  if (req.user.activeRole !== UserRoleEnum.PATIENT) {
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

    try {
      await createNotification({
        recipient: appointment.doctor.user._id,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.APPOINTMENT_BOOKED,
        title: "New Appointment Booked",
        message: `${appointment.patient.name} booked an appointment with you.`,
        entityId: appointment._id,
        entityType: "appointment",
      });
    } catch (error) {
      console.error("Failed to create notification:", error);
    }

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
  if (req.user.activeRole !== UserRoleEnum.PATIENT) {
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
  if (req.user.activeRole !== UserRoleEnum.DOCTOR) {
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

    Appointment.countDocuments(query),
  ]);

  // Get payment status
  const appointmentIds = appointments.map((appointment) => appointment._id);

  const payments = await Payment.find({
    appointment: { $in: appointmentIds },
  }).select("appointment status");

  const paymentMap = new Map(
    payments.map((payment) => [
      payment.appointment.toString(),
      payment.status,
    ])
  );

  const dtoList = appointments.map((appointment) => {
    appointment.paymentStatus =
      paymentMap.get(appointment._id.toString()) ?? null;

    return mapAppointmentToDTO(appointment);
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        appointments: dtoList,
        total,
        page,
        limit,
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

  const appointmentDoc = await Appointment.findById(id).populate(
    appointmentPopulate
  );

  if (!appointmentDoc) {
    throw new ApiError(404, "Appointment not found");
  }

  const [payment, review] = await Promise.all([
    Payment.findOne({
      appointment: appointmentDoc._id,
    }).select("status"),

    Review.findOne({
      appointment: appointmentDoc._id,
      isDeleted: false,
    }).select(" _id rating review createdAt updatedAt"),
  ]);


  const appointment = appointmentDoc.toObject();
  ;
  console.log("Payment:", payment);
  console.log("Payment Status:", payment?.status);
  console.log("Review from DB:", review);
  appointment.paymentStatus = payment?.status ?? null;

  appointment.review = review ?? null;
  if (
    req.user.activeRole === UserRoleEnum.PATIENT &&
    appointment.patient._id.toString() !== req.user._id.toString()
  ) {
    throw new ApiError(403, "Forbidden");
  }

  if (req.user.activeRole === UserRoleEnum.DOCTOR) {
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

  if (req.user.activeRole === UserRoleEnum.PATIENT) {
    if (appointment.patient.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }
  } else if (req.user.activeRole !== UserRoleEnum.ADMIN) {
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

    await createNotification({
      recipient: populatedAppointment.doctor.user?._id,
      sender: req.user._id,
      type: NOTIFICATION_TYPES.APPOINTMENT_RESCHEDULED,
      title: "Appointment rescheduled",
      message: `${populatedAppointment.patient.name} rescheduled the appointment.`,
      entityId: populatedAppointment._id,
      entityType: "appointment"
    });

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

  if (req.user.activeRole !== UserRoleEnum.DOCTOR) {
    throw new ApiError(403, "Only doctors can update appointment status");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointmentDoc = await Appointment.findById(id);

  if (!appointmentDoc) {
    throw new ApiError(404, "Appointment not found");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor || appointmentDoc.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, "Unauthorized");
  }

  const allowedTransitions = {
    [APPOINTMENT_STATUS.PENDING]: [
      APPOINTMENT_STATUS.CONFIRMED,
      APPOINTMENT_STATUS.CANCELLED,
    ],
    [APPOINTMENT_STATUS.CONFIRMED]: [APPOINTMENT_STATUS.COMPLETED],
    [APPOINTMENT_STATUS.COMPLETED]: [],
    [APPOINTMENT_STATUS.CANCELLED]: [],
  };

  if (!allowedTransitions[appointmentDoc.status].includes(status)) {
    throw new ApiError(400, "Invalid transition");
  }

  appointmentDoc.status = status;
  await appointmentDoc.save();

  const populatedAppointment = await populateAppointment(appointmentDoc);

  const [payment, review] = await Promise.all([
    Payment.findOne({
      appointment: populatedAppointment._id,
    }).select("status"),

    Review.findOne({
      appointment: populatedAppointment._id,
      isDeleted: false,
    }).select("rating review createdAt updatedAt"),
  ]);

  const appointment = populatedAppointment.toObject();
  console.log("Payment:", payment);
  console.log("Payment Status:", payment?.status);

  appointment.paymentStatus = payment?.status ?? null;
  appointment.review = review
    ? {
      _id: review._id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }
    : null;


  await createNotification({
    recipient: populatedAppointment.patient._id,
    sender: req.user._id,
    type:
      status === APPOINTMENT_STATUS.COMPLETED
        ? NOTIFICATION_TYPES.APPOINTMENT_COMPLETED
        : NOTIFICATION_TYPES.APPOINTMENT_CONFIRMED,
    title:
      status === APPOINTMENT_STATUS.COMPLETED
        ? "Appointment completed"
        : "Appointment confirmed",
    message:
      status === APPOINTMENT_STATUS.COMPLETED
        ? `${populatedAppointment.doctor.user?.name} marked your appointment as completed.`
        : `${populatedAppointment.doctor.user?.name} confirmed your appointment.`,
    entityId: populatedAppointment._id,
    entityType: "appointment",
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAppointmentToDTO(appointment),
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

  if (req.user.activeRole === UserRoleEnum.PATIENT) {
    if (appointment.patient.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }

    if (appointment.status !== APPOINTMENT_STATUS.PENDING) {
      throw new ApiError(400, "Only pending appointments can be cancelled");
    }
  } else if (req.user.activeRole === UserRoleEnum.DOCTOR) {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }

    if (
      appointment.status === APPOINTMENT_STATUS.COMPLETED ||
      appointment.status === APPOINTMENT_STATUS.CANCELLED
    ) {
      throw new ApiError(400, "Completed appointments cannot be cancelled");
    }
  } else if (req.user.activeRole !== UserRoleEnum.ADMIN) {
    throw new ApiError(403, "Unauthorized");
  }

  appointment.status = APPOINTMENT_STATUS.CANCELLED;
  await appointment.save();

  const populatedAppointment = await populateAppointment(appointment);

  let recipient = null;
  const title = "Appointment cancelled";
  let message = "An appointment was cancelled.";

  if (req.user.role === UserRoleEnum.PATIENT) {
    recipient = populatedAppointment.doctor.user?._id;
    message = `${populatedAppointment.patient.name} cancelled the appointment.`;
  } else if (req.user.role === UserRoleEnum.DOCTOR) {
    recipient = populatedAppointment.patient._id;
    message = `${populatedAppointment.doctor.user?.name} cancelled your appointment.`;
  } else if (req.user.role === UserRoleEnum.ADMIN) {
    recipient = populatedAppointment.patient._id;
    message = `An admin cancelled your appointment with ${populatedAppointment.doctor.user?.name}.`;
  }

  await createNotification({
    recipient,
    sender: req.user._id,
    type: NOTIFICATION_TYPES.APPOINTMENT_CANCELLED,
    title,
    message,
    entityId: populatedAppointment._id,
    entityType: "appointment"
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAppointmentToDTO(populatedAppointment),
      "Appointment cancelled successfully"
    )
  );
});
const createPrescription = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(id);

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (req.user.activeRole !== UserRoleEnum.DOCTOR) {
    throw new ApiError(403, "Forbidden");
  }

  const doctor = await Doctor.findOne({ user: req.user._id });

  if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
    throw new ApiError(403, "Forbidden");
  }

  if (appointment.status !== APPOINTMENT_STATUS.COMPLETED) {
    throw new ApiError(400, "Only completed appointments can have prescriptions");



  }

  console.log("Request Body:", req.body);

  const { diagnosis, medicine, instructions } = req.body;


  if (!diagnosis && !medicine && !instructions) {
    throw new ApiError(
      400,
      "At least one prescription field is required"
    );
  }

  appointment.prescription = {
    diagnosis,
    medicine,
    instructions
  };

  await appointment.save();
  const populatedAppointment = await populateAppointment(appointment);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapAppointmentToDTO(populatedAppointment),
      "Prescription created successfully"
    )
  );
})

export {
  createAppointment,
  getAppointmentsForUser,
  getAppointmentsForDoctor,
  getAppointmentsById,
  rescheduleAppointment,
  updateAppointmentStatus,
  cancelAppointment,
  getAvailableSlots,
  createPrescription
};
