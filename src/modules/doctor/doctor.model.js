import mongoose, { Schema } from "mongoose";
import { DaysOfWeek } from "../../utils/constants.js";

// ---------- Helpers ----------
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const toMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// ---------- Validators ----------
const validateUniqueDays = (availability) => {
  const days = availability.map((a) => a.day);
  if (days.length !== new Set(days).size) {
    throw new Error("Duplicate days in availability");
  }
};

const validateSlotOrder = (availability) => {
  for (const day of availability) {
    for (const slot of day.slots) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);

      if (start >= end) {
        throw new Error("Slot start must be before end");
      }
    }
  }
};

const validateNoOverlap = (availability) => {
  for (const day of availability) {
    const sorted = [...day.slots].sort(
      (a, b) => toMinutes(a.start) - toMinutes(b.start)
    );

    for (let i = 0; i < sorted.length - 1; i++) {
      const currentEnd = toMinutes(sorted[i].end);
      const nextStart = toMinutes(sorted[i + 1].start);

      if (currentEnd > nextStart) {
        throw new Error("Overlapping slots are not allowed");
      }
    }
  }
};

const validateMinRange = function (availability) {
  for (const day of availability) {
    for (const slot of day.slots) {
      const start = toMinutes(slot.start);
      const end = toMinutes(slot.end);

      if (end - start < this.slotDuration) {
        throw new Error("Slot range must be >= slotDuration");
      }
    }
  }
};

// ---------- Schema ----------
const doctorSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

    specialization: {
      type: String,
      required: true,
      trim: true
    },

    experience: {
      type: Number,
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
    },

    slotDuration: {
      type: Number,
      default: 30, // minutes
      min: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },

    availability: [
      {
        day: {
          type: String,
          enum: DaysOfWeek,
          required: true
        },

        slots: [
          {
            start: {
              type: String,
              required: true,
              match: TIME_REGEX,
              set: (v) => v.trim()
            },
            end: {
              type: String,
              required: true,
              match: TIME_REGEX,
              set: (v) => v.trim()
            }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

// ---------- Validation Runner ----------
const runAvailabilityValidation = function (availability) {
  if (!availability || availability.length === 0) {
    return;
  }

  validateUniqueDays(availability);
  validateSlotOrder(availability);
  validateNoOverlap(availability);
  validateMinRange.call(this, availability);
};

// ---------- Hooks ----------

// Works for .save()
doctorSchema.pre("save", function (next) {
  try {
    runAvailabilityValidation.call(this, this.availability);
    next();
  } catch (err) {
    next(err);
  }
});

// Works for findOneAndUpdate / updateOne
doctorSchema.pre(["findOneAndUpdate", "updateOne"], function (next) {
  try {
    const update = this.getUpdate();

    const availability =
      update?.availability || update?.$set?.availability;

    if (!availability) return next();

    runAvailabilityValidation.call(
      { slotDuration: update.slotDuration || 30 },
      availability
    );

    next();
  } catch (err) {
    next(err);
  }
});

// ---------- Index ----------
doctorSchema.index({ user: 1 });

// ---------- Model ----------
export const Doctor = mongoose.model("Doctor", doctorSchema);
