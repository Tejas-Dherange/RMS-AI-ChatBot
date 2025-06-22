import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {healthCheckRouter} from "./controllers/healthCheck.controllers.js";
import  userRoutes from "./routes/auth.routes.js"
import chaBotRoutes from "./routes/chatBot.routes.js";

const app = express(); 

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
app.use("/api/v1/user",userRoutes) 
app.use("/api/v1/chatbot", chaBotRoutes)

export default app;
