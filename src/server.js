import app from "./app.js";
import dotenv from 'dotenv';
import connectDB from "./config/db.config.js";

dotenv.config({ path: "./src/.env" });  
const PORT = process.env.PORT ;

connectDB()
.then(() => {

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})})
.catch((error) => {
  console.error("Failed to connect to the database:", error);
  process.exit(1);
});