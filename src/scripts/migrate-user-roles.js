import dotenv from "dotenv";
import path from "path";

import mongoose from "mongoose";

import { User } from "../modules/user/user.model.js";

dotenv.config({ path: "./src/.env" });  

const migrate = async () => {
  try {
    console.log("ENV:", process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI);

    console.log("✅ Connected to MongoDB");

    const users = await User.collection.find({}).toArray();

for (const user of users) {
  const update = {};

  if (user.role === "doctor") {
    update.roles = ["patient", "doctor"];
    update.activeRole = "doctor";
  } else if (user.role === "patient") {
    update.roles = ["patient"];
    update.activeRole = "patient";
  } else if (user.role === "admin") {
    update.roles = ["admin"];
    update.activeRole = "admin";
  }

  await User.collection.updateOne(
    { _id: user._id },
    {
      $set: update,
      $unset: { role: "" },
    }
  );

  console.log(`Migrated ${user.email}`);
}

    console.log("🎉 Migration completed");
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

migrate();