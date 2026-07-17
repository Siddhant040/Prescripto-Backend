import mongoose, { Schema } from "mongoose";
import {AvailableAppointmentStatus, APPOINTMENT_STATUS} from "../../utils/constants.js";


const appointmentSchema = new Schema({
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

  appointmentDateTime: {
      type: Date,
      required: true
    },

  status: {
    type: String,
    enum: AvailableAppointmentStatus,
    default: APPOINTMENT_STATUS.PENDING
  },
  prescription: {
  diagnosis: String,
  medicine: String,
  instructions: String,
},
}, { timestamps: true });

//  Prevent double booking
//  A doctor cannot have two appointments at the same date/time
//
appointmentSchema.index(
  { doctor: 1, appointmentDateTime: 1 },
  { unique: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);