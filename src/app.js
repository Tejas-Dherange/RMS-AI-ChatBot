import express from "express";
import healthCheckRouter from "./controllers/healthCheck.controllers";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use("/api/v1/user", healthCheckRouter);


export default app;
