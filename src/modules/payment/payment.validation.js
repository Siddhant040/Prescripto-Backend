import { z } from "zod";
import {
  AvailablePaymentProvider
} from "../../utils/constants.js";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

export const createPaymentOrderSchema = z.object({
  appointmentId: objectId,
  provider: z.enum(AvailablePaymentProvider),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter code")
    .toUpperCase()
    .optional()
});

export const verifyPaymentSchema = z.object({
  providerOrderId: z.string().trim().min(1, "Provider order ID is required"),
  providerPaymentId: z
    .string()
    .trim()
    .min(1, "Provider payment ID is required"),
  providerSignature: z
    .string()
    .trim()
    .min(1, "Provider signature is required")
});

export const failPaymentSchema = z.object({
  providerOrderId: z.string().trim().min(1, "Provider order ID is required"),
  failureReason: z.string().trim().max(500).optional()
});
