import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../../modules/user/user.model.js";
import { UserRoleEnum } from "../../utils/constants.js";

dotenv.config({
  path: "./src/.env",
});

const patients = [
  {
    name: "Ishita Sharma",
    email: "patient06@prescripto.test",
    phone: "9000000006",
    address: "33 Salt Lake, Kolkata, West Bengal 700091",
    gender: "female",
    dateOfBirth: new Date("1998-04-12"),
  },
  {
    name: "Aditya Kumar",
    email: "patient07@prescripto.test",
    phone: "9000000007",
    address: "11 Anna Nagar, Chennai, Tamil Nadu 600040",
    gender: "male",
    dateOfBirth: new Date("1995-08-21"),
  },
  {
    name: "Meera Kapoor",
    email: "patient08@prescripto.test",
    phone: "9000000008",
    address: "56 Banjara Hills, Hyderabad, Telangana 500034",
    gender: "female",
    dateOfBirth: new Date("2000-01-15"),
  },
  {
    name: "Rahul Yadav",
    email: "patient09@prescripto.test",
    phone: "9000000009",
    address: "21 Gomti Nagar, Lucknow, Uttar Pradesh 226010",
    gender: "male",
    dateOfBirth: new Date("1997-06-09"),
  },
  {
    name: "Sneha Malhotra",
    email: "patient10@prescripto.test",
    phone: "9000000010",
    address: "9 Civil Lines, Prayagraj, Uttar Pradesh 211001",
    gender: "female",
    dateOfBirth: new Date("1999-11-03"),
  },
  {
    name: "Kunal Agarwal",
    email: "patient11@prescripto.test",
    phone: "9000000011",
    address: "38 Model Town, Chandigarh 160019",
    gender: "male",
    dateOfBirth: new Date("1994-03-27"),
  },
  {
    name: "Priya Joshi",
    email: "patient12@prescripto.test",
    phone: "9000000012",
    address: "72 Alkapuri, Vadodara, Gujarat 390007",
    gender: "female",
    dateOfBirth: new Date("1996-09-18"),
  },
  {
    name: "Rohan Bansal",
    email: "patient13@prescripto.test",
    phone: "9000000013",
    address: "14 Koregaon Park, Pune, Maharashtra 411001",
    gender: "male",
    dateOfBirth: new Date("1993-12-05"),
  },
  {
    name: "Neha Saini",
    email: "patient14@prescripto.test",
    phone: "9000000014",
    address: "31 Rajarhat, Kolkata, West Bengal 700156",
    gender: "female",
    dateOfBirth: new Date("2001-02-11"),
  },
  {
    name: "Vivek Tiwari",
    email: "patient15@prescripto.test",
    phone: "9000000015",
    address: "45 Rohini Sector 9, New Delhi, Delhi 110085",
    gender: "male",
    dateOfBirth: new Date("1992-07-14"),
  },
  {
    name: "Simran Kaur",
    email: "patient16@prescripto.test",
    phone: "9000000016",
    address: "19 Mansarovar, Jaipur, Rajasthan 302020",
    gender: "female",
    dateOfBirth: new Date("1998-10-22"),
  },
  {
    name: "Mohit Chauhan",
    email: "patient17@prescripto.test",
    phone: "9000000017",
    address: "63 HSR Layout, Bengaluru, Karnataka 560102",
    gender: "male",
    dateOfBirth: new Date("1996-05-30"),
  },
  {
    name: "Pooja Mishra",
    email: "patient18@prescripto.test",
    phone: "9000000018",
    address: "25 Vashi, Navi Mumbai, Maharashtra 400703",
    gender: "female",
    dateOfBirth: new Date("1997-01-08"),
  },
  {
    name: "Nikhil Saxena",
    email: "patient19@prescripto.test",
    phone: "9000000019",
    address: "47 Ashok Nagar, Kanpur, Uttar Pradesh 208012",
    gender: "male",
    dateOfBirth: new Date("1991-09-26"),
  },
  {
    name: "Kavya Reddy",
    email: "patient20@prescripto.test",
    phone: "9000000020",
    address: "8 Dwarka Sector 12, New Delhi, Delhi 110075",
    gender: "female",
    dateOfBirth: new Date("2000-06-17"),
  },
];

const seedPatients = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existingEmails = await User.find({
      email: {
        $in: patients.map((patient) => patient.email),
      },
    }).select("email");

    if (existingEmails.length > 0) {
      process.exit(1);
    }

    const users = patients.map((patient) => ({
      ...patient,
      password: "Test@12345",
      roles: [UserRoleEnum.PATIENT],
      activeRole: UserRoleEnum.PATIENT,
      isEmailVerified: true,
      isActive: true,
    }));

    await User.create(users);

    await mongoose.disconnect();
  } catch (error) {
    console.error("Patient seed failed:", error);

    await mongoose.disconnect();

    process.exit(1);
  }
};

seedPatients();
