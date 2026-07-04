import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters long")
    .max(50, "Name cannot exceed 50 characters")
    .optional(),

  phone: z
    .string()
    .trim()
    .regex(
      /^[6-9]\d{9}$/,
      "Please enter a valid 10-digit Indian mobile number"
    )
    .optional(),

  gender: z
    .enum(["male", "female", "other"], {
      errorMap: () => ({
        message: "Gender must be male, female or other",
      }),
    })
    .optional(),

  dateOfBirth: z
  .coerce
  .date()
  .refine(
    (date) => date <= new Date(),
    "Date of birth cannot be in the future"
  )
  .optional(),
  address: z
    .string()
    .trim()
    .max(200, "Address cannot exceed 200 characters")
    .optional(),
});