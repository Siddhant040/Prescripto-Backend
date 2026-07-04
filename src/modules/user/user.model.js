import mongoose, { Schema } from "mongoose";
import { AvailableRole, UserRoleEnum } from "../../utils/constants.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,


    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,

    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 6
    },
    role: {
        type: String,
        enum: AvailableRole,
        default: UserRoleEnum.PATIENT
    },
    avatar: {
        type: String,
        trim: true
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },

    gender: {
        type: String,
        enum: ["male", "female", "other"],
        default: "other"
    },


    dateOfBirth: {
        type: Date,
        default: null
    },
    address: {
        type: String,
        default: null
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    refreshToken: {
        type: String,

    },
    forgotPasswordToken: {
        type: String,

    },
    forgotPasswordTokenExpiry: {
        type: Date,

    },
    emailVerificationToken: {
        type: String,

    },
    emailVerificationTokenExpiry: {
        type: Date,

    },
}, { timestamps: true })

// hooks to hash password before saving
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next()
    }
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function () {
    return jwt.sign({
        _id: this._id,
        role: this.role,
        email: this.email,
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m"
    })
}

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id,
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "7d"
    })
}

userSchema.methods.generateTemporaryToken = function () {
    const unhashedToken = crypto.randomBytes(20).toString("hex") // Generate a random token (unhashed)
    const hashedToken = crypto
        .createHash("sha256")
        .update(unhashedToken) // Use the unhashed token as input
        .digest("hex") // Convert to a hex string


    const tokenExpiry = Date.now() + (20 * 60 * 1000) // 20 minutes

    return { unhashedToken, hashedToken, tokenExpiry }
}


export const User = mongoose.model("User", userSchema)