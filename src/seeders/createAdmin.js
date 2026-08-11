import dotenv from "dotenv";
import connectDB from "../config/db.config.js";
import { User } from "../modules/user/user.model.js";
import { UserRoleEnum } from "../utils/constants.js";

dotenv.config({ path: "./src/.env" });

const [, , emailArg, passwordArg, nameArg] = process.argv;

const email = emailArg?.trim()?.toLowerCase();
const password = passwordArg?.trim();
const name = nameArg?.trim() || "Admin User";

if (!email) {
  console.error(
    "Usage: npm run seed:admin -- <email> <password-if-creating> [name]"
  );
  process.exit(1);
}

const createOrPromoteAdmin = async () => {
  try {
    await connectDB();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      existingUser.role = UserRoleEnum.ADMIN;
      existingUser.isEmailVerified = true;
      await existingUser.save({ validateBeforeSave: false });

      process.exit(0);
    }

    if (!password) {
      console.error(
        "No user found with that email. Provide a password to create a new admin."
      );
      process.exit(1);
    }

    const adminUser = await User.create({
      name,
      email,
      password,
      role: UserRoleEnum.ADMIN,
      isEmailVerified: true,
    });

    void adminUser;
    process.exit(0);
  } catch (error) {
    console.error("Failed to create or promote admin:", error.message);
    process.exit(1);
  }
};

createOrPromoteAdmin();
