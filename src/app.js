import dotenv from "dotenv";
import express from 'express';
import cors from 'cors';
const app = express();
import cookieParser from "cookie-parser";
import { errorHandler } from "./middleware/error.middleware.js";

dotenv.config({ path: "./src/.env" });

const allowedOrigin = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
].filter(Boolean);
const corsOptions = {
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

//middleware configuration

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({limit:"16kb",extended:true}))
app.use(express.static("public"))

console.log("Allowed Origin:", allowedOrigin);

//cors configuration 
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());


//importing routes
import healthCheckRoute from './modules/healthcheck/healthCheck.route.js';
import userRoute from './modules/user/user.routes.js';
import doctorRoute from './modules/doctor/doctor.routes.js';
import appointmentRoute from './modules/Appointment/appointment.routes.js';
import reviewRoute from './modules/review/review.routes.js';
import notificationRoute from './modules/notification/notification.routes.js';
import adminRoute from './modules/admin/admin.routes.js';
import paymentRoute from './modules/payment/payment.routes.js';
import adminAuthRoute from './modules/user/admin.auth.routes.js';
import statsRoute from './modules/stats/stats.routes.js';

app.use("/api/v1/healthCheck", healthCheckRoute)
app.use("/api/v1/auth", userRoute)
app.use("/api/v1/doctor", doctorRoute)
app.use("/api/v1/appointment", appointmentRoute)
app.use("/api/v1/review", reviewRoute)
app.use("/api/v1/notification", notificationRoute)
app.use("/api/v1/admin", adminRoute)
app.use("/api/v1/payment", paymentRoute)
app.use("/api/v1/auth2/admin", adminAuthRoute)
app.use("/api/v1/stats", statsRoute)
app.use(errorHandler)


export  default app;
