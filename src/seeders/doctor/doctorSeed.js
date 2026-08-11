import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../../modules/user/user.model.js";
import { UserRoleEnum } from "../../utils/constants.js";

dotenv.config({
  path: "./src/.env",
});

const doctorCandidates = [
  {
    name: "Ansh Patel",
    email: "doctor01@prescripto.test",
    phone: "9000000021",
    address: "24 Green Park, New Delhi, Delhi 110016",
    gender: "male",
    dateOfBirth: new Date("1990-03-15"),
  },
  {
    name: "Neeraj Kapoor",
    email: "doctor02@prescripto.test",
    phone: "9000000022",
    address: "18 Sector 62, Noida, Uttar Pradesh 201301",
    gender: "male",
    dateOfBirth: new Date("1988-07-21"),
  },
  {
    name: "Priya Sharma",
    email: "doctor03@prescripto.test",
    phone: "9000000023",
    address: "42 Vaishali Nagar, Jaipur, Rajasthan 302021",
    gender: "female",
    dateOfBirth: new Date("1992-01-11"),
  },
  {
    name: "Vikram Singh",
    email: "doctor04@prescripto.test",
    phone: "9000000024",
    address: "15 Indiranagar, Bengaluru, Karnataka 560038",
    gender: "male",
    dateOfBirth: new Date("1987-11-04"),
  },
  {
    name: "Aditi Mehta",
    email: "doctor05@prescripto.test",
    phone: "9000000025",
    address: "27 Kharadi, Pune, Maharashtra 411014",
    gender: "female",
    dateOfBirth: new Date("1991-05-19"),
  },
  {
    name: "Rohit Verma",
    email: "doctor06@prescripto.test",
    phone: "9000000026",
    address: "33 Salt Lake, Kolkata, West Bengal 700091",
    gender: "male",
    dateOfBirth: new Date("1989-09-08"),
  },
  {
    name: "Sneha Gupta",
    email: "doctor07@prescripto.test",
    phone: "9000000027",
    address: "11 Anna Nagar, Chennai, Tamil Nadu 600040",
    gender: "female",
    dateOfBirth: new Date("1993-02-24"),
  },
  {
    name: "Rajiv Malhotra",
    email: "doctor08@prescripto.test",
    phone: "9000000028",
    address: "56 Banjara Hills, Hyderabad, Telangana 500034",
    gender: "male",
    dateOfBirth: new Date("1986-12-13"),
  },
  {
    name: "Nisha Agarwal",
    email: "doctor09@prescripto.test",
    phone: "9000000029",
    address: "21 Gomti Nagar, Lucknow, Uttar Pradesh 226010",
    gender: "female",
    dateOfBirth: new Date("1990-06-30"),
  },
  {
    name: "Karan Joshi",
    email: "doctor10@prescripto.test",
    phone: "9000000030",
    address: "45 Rohini Sector 9, New Delhi, Delhi 110085",
    gender: "male",
    dateOfBirth: new Date("1988-04-17"),
  },
];

const seedDoctorCandidates = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingEmails = await User.find({
      email: {
        $in: doctorCandidates.map((user) => user.email),
      },
    }).select("email");

    if (existingEmails.length > 0) {
      process.exit(1);
    }

    const users = doctorCandidates.map((user) => ({
      ...user,
      password: "Test@12345",
      roles: [UserRoleEnum.PATIENT],
      activeRole: UserRoleEnum.PATIENT,
      isEmailVerified: true,
      isActive: true,
    }));

    await User.create(users);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Doctor candidate seed failed:", error);

    await mongoose.disconnect();

    process.exit(1);
  }
};

seedDoctorCandidates();
