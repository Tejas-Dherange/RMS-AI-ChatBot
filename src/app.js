import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {healthCheckRouter} from "./controllers/healthCheck.controllers.js";
import  userRoutes from "./routes/auth.routes.js"
import projectRoutes from "./routes/project.routes.js"
import taskRoutes from "./routes/task.routes.js"

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
app.use("/api/v1/project",projectRoutes)
app.use("/api/v1/task",taskRoutes)

export default app;
