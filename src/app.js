import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {healthCheckRouter} from "./controllers/healthCheck.controllers.js";
import  userRoutes from "./routes/auth.routes.js"

const app = express(); 

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(cookieParser());
app.use(express.json());


app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/user",userRoutes)

export default app;
