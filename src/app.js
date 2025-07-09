import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer"; // <-- Add this import
import { healthCheckRouter } from "./controllers/healthCheck.controllers.js";
import userRoutes from "./routes/auth.routes.js";
import chaBotRoutes from "./routes/chatBot.routes.js";
import fs from "fs"
const app = express();

// Create uploads directory if it doesn't exist
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/chatbot", chaBotRoutes);

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File too large. Maximum size is 10MB.",
      });
    }
  }

  if (error.message === "Only Excel files (.xlsx, .xls) are allowed!") {
    return res.status(400).json({
      success: false,
      error: "Invalid file type. Please upload Excel files only.",
    });
  }

  res.status(500).json({
    success: false,
    error: "Something went wrong!",
    details: error.message,
  });
});
export default app;
