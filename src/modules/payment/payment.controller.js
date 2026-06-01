import Razorpay from "razorpay";
import crypto from "crypto";
import mongoose from "mongoose";
import { ApiError } from "../../errors/apiError.js";
import { ApiResponse } from "../../errors/apiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
  UserRoleEnum
} from "../../utils/constants.js";
import { Appointment } from "../Appointment/appointment.model.js";
import { Doctor } from "../doctor/doctor.model.js";
import { mapPaymentToDTO, mapPaymentsToDTO } from "./payment.dto.js";
import { Payment } from "./payment.model.js";

const paymentPopulate = [
  {
    path: "appointment",
    select: "appointmentDateTime status"
  },
  {
    path: "patient",
    select: "name email avatar"
  },
  {
    path: "doctor",
    select: "user specialization consultationFee",
    populate: {
      path: "user",
      select: "name email avatar"
    }
  }
];

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Razorpay keys are not configured");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
};

const createProviderOrder = async ({
  provider,
  amount,
  currency,
  appointmentId
}) => {
  if (provider !== PAYMENT_PROVIDER.RAZORPAY) {
    return {
      id: `order_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`,
      amount,
      currency
    };
  }

  const razorpay = getRazorpayInstance();

  return razorpay.orders.create({
    amount: Math.round(amount * 100),
    currency,
    receipt: appointmentId.toString(),
    notes: {
      appointmentId: appointmentId.toString()
    }
  });
};

const verifyRazorpaySignature = ({
  providerOrderId,
  providerPaymentId,
  providerSignature
}) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new ApiError(500, "Razorpay secret is not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${providerOrderId}|${providerPaymentId}`)
    .digest("hex");

  return expectedSignature === providerSignature;
};

const createPaymentOrder = asyncHandler(async (req, res) => {
  const { appointmentId, provider, currency = "INR" } = req.body;

  if (req.user.role !== UserRoleEnum.PATIENT) {
    throw new ApiError(403, "Only patients can create payment orders");
  }

  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    throw new ApiError(400, "Invalid appointment ID");
  }

  const appointment = await Appointment.findById(appointmentId).populate({
    path: "doctor",
    select: "consultationFee"
  });

  if (!appointment) {
    throw new ApiError(404, "Appointment not found");
  }

  if (appointment.patient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only pay for your own appointment");
  }

  const existingPayment = await Payment.findOne({
    appointment: appointment._id
  }).populate(paymentPopulate);

  if (existingPayment?.status === PAYMENT_STATUS.PAID) {
    throw new ApiError(409, "Payment is already completed for this appointment");
  }

  if (existingPayment?.status === PAYMENT_STATUS.PENDING) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          payment: mapPaymentToDTO(existingPayment),
          providerOrder: {
            id: existingPayment.providerOrderId,
            amount:
              existingPayment.provider === PAYMENT_PROVIDER.RAZORPAY
                ? Math.round(existingPayment.amount * 100)
                : existingPayment.amount,
            currency: existingPayment.currency,
            keyId:
              existingPayment.provider === PAYMENT_PROVIDER.RAZORPAY
                ? process.env.RAZORPAY_KEY_ID
                : undefined
          }
        },
        "Existing payment order fetched successfully"
      )
    );
  }

  const amount = appointment.doctor?.consultationFee;

  if (amount === null || amount === undefined) {
    throw new ApiError(400, "Doctor consultation fee is missing");
  }

  const providerOrder = await createProviderOrder({
    provider,
    amount,
    currency,
    appointmentId: appointment._id
  });

  let payment;

  try {
    payment = await Payment.create({
      appointment: appointment._id,
      patient: req.user._id,
      doctor: appointment.doctor._id,
      amount,
      currency,
      provider,
      providerOrderId: providerOrder.id,
      status: PAYMENT_STATUS.PENDING
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, "Payment order already exists for this appointment");
    }

    throw error;
  }

  const populatedPayment = await payment.populate(paymentPopulate);

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        payment: mapPaymentToDTO(populatedPayment),
        providerOrder: {
          id: providerOrder.id,
          amount: providerOrder.amount,
          currency: providerOrder.currency,
          keyId:
            provider === PAYMENT_PROVIDER.RAZORPAY
              ? process.env.RAZORPAY_KEY_ID
              : undefined
        }
      },
      "Payment order created successfully"
    )
  );
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { providerOrderId, providerPaymentId, providerSignature } = req.body;

  const payment = await Payment.findOne({
    providerOrderId,
    status: PAYMENT_STATUS.PENDING
  });

  if (!payment) {
    throw new ApiError(404, "Pending payment order not found");
  }

  if (payment.patient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only verify your own payment");
  }

  if (payment.provider === PAYMENT_PROVIDER.RAZORPAY) {
    const isSignatureValid = verifyRazorpaySignature({
      providerOrderId,
      providerPaymentId,
      providerSignature
    });

    if (!isSignatureValid) {
      throw new ApiError(400, "Invalid payment signature");
    }
  }

  payment.status = PAYMENT_STATUS.PAID;
  payment.providerPaymentId = providerPaymentId;
  payment.providerSignature = providerSignature;
  payment.paidAt = new Date();
  payment.failedAt = undefined;
  payment.failureReason = undefined;

  await payment.save();

  const populatedPayment = await payment.populate(paymentPopulate);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapPaymentToDTO(populatedPayment),
      "Payment verified successfully"
    )
  );
});

const failPayment = asyncHandler(async (req, res) => {
  const { providerOrderId, failureReason } = req.body;

  const payment = await Payment.findOne({
    providerOrderId,
    status: PAYMENT_STATUS.PENDING
  });

  if (!payment) {
    throw new ApiError(404, "Pending payment order not found");
  }

  if (payment.patient.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You can only update your own payment");
  }

  payment.status = PAYMENT_STATUS.FAILED;
  payment.failedAt = new Date();
  payment.failureReason = failureReason || "Payment failed";

  await payment.save();

  const populatedPayment = await payment.populate(paymentPopulate);

  return res.status(200).json(
    new ApiResponse(
      200,
      mapPaymentToDTO(populatedPayment),
      "Payment marked as failed"
    )
  );
});

const getMyPayments = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10 } = req.query;
  page = Number(page);
  limit = Number(limit);

  if (Number.isNaN(page) || page < 1) {
    page = 1;
  }

  if (Number.isNaN(limit) || limit < 1 || limit > 50) {
    limit = 10;
  }

  const query = {};

  if (req.user.role === UserRoleEnum.PATIENT) {
    query.patient = req.user._id;
  } else if (req.user.role === UserRoleEnum.DOCTOR) {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
      throw new ApiError(404, "Doctor profile not found");
    }

    query.doctor = doctor._id;
  } else if (req.user.role !== UserRoleEnum.ADMIN) {
    throw new ApiError(403, "Unauthorized");
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate(paymentPopulate)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query)
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        payments: mapPaymentsToDTO(payments),
        total,
        page,
        limit
      },
      "Payments fetched successfully"
    )
  );
});

const getPaymentById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid payment ID");
  }

  const payment = await Payment.findById(id).populate(paymentPopulate);

  if (!payment) {
    throw new ApiError(404, "Payment not found");
  }

  if (req.user.role === UserRoleEnum.PATIENT) {
    if (payment.patient._id.toString() !== req.user._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }
  } else if (req.user.role === UserRoleEnum.DOCTOR) {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor || payment.doctor._id.toString() !== doctor._id.toString()) {
      throw new ApiError(403, "Forbidden");
    }
  } else if (req.user.role !== UserRoleEnum.ADMIN) {
    throw new ApiError(403, "Unauthorized");
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      mapPaymentToDTO(payment),
      "Payment fetched successfully"
    )
  );
});

export {
  createPaymentOrder,
  verifyPayment,
  failPayment,
  getMyPayments,
  getPaymentById
};
