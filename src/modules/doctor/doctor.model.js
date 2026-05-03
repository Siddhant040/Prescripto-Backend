import mongoose, { Schema } from "mongoose";

const doctorSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true // one user = one doctor profile
    },

    specialization: {
      type: String,
      required: true,
      trim: true
    },

    experience: {
      type: Number, // years
      required: true,
      min: 0
    },

    consultationFee: {
      type: Number,
      required: true,
      min: 0
    },

    qualifications: [
      {
        type: String,
        trim: true
      }
    ],

    bio: {
      type: String,
      trim: true,
      maxlength: 500
    },

    clinicAddress: {
      type: String,
      trim: true
    },

    isVerified: {
      type: Boolean,
      default: false
    },

    isAvailable: {
      type: Boolean,
      default: true
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    }
  },
  { timestamps: true }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);