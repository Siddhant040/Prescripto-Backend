import { z } from "zod";

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ID");

const reviewText = z
  .string()
  .trim()
  .max(500, "Review must be at most 500 characters");

export const createReviewSchema = z.object({
  appointmentId: objectId,
  rating: z
    .coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
  review: reviewText.optional()
});

export const updateReviewSchema = z
  .object({
    rating: z
      .coerce
      .number()
      .int("Rating must be a whole number")
      .min(1, "Rating must be at least 1")
      .max(5, "Rating must be at most 5")
      .optional(),
    review: reviewText.optional()
  })
  .refine(
    (data) => data.rating !== undefined || data.review !== undefined,
    {
      message: "At least one field is required to update the review"
    }
  );
