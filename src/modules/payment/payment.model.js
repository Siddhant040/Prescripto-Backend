import mongoose, { Schema } from "mongoose";
import {
  AvailablePaymentProvider,
  AvailablePaymentStatus
} from "../../utils/constants.js";

const paymentSchema = new Schema(
  {
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: AvailablePaymentStatus,
      default: "pending"
    },
    provider: {
      type: String,
      enum: AvailablePaymentProvider,
      required: true
    },
    providerOrderId: {
      type: String,
      trim: true,
      index: true
    },
    providerPaymentId: {
      type: String,
      trim: true,
      index: true
    },
    providerSignature: {
      type: String,
      trim: true
    },
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date,
    failureReason: String,
    refundReason: String
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);
