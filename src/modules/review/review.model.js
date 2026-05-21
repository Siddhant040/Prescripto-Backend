import mongoose, { Schema } from "mongoose";
const reviewSchema = new Schema({
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
    appointment: {
        type: Schema.Types.ObjectId,
        ref: "Appointment",
        required: true,
        unique: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        maxlength: 500

    },
    isEdited: {
        type: Boolean,
        default: false
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
export const Review = mongoose.model("Review", reviewSchema);
