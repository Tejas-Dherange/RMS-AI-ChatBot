import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import {healthCheckRouter} from "./controllers/healthCheck.controllers.js";
import  userRoutes from "./routes/auth.routes.js"
import chaBotRoutes from "./routes/chatBot.routes.js";
import { GoogleGenAI } from "@google/genai";

const app = express(); 

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.json());
const ai = new GoogleGenAI({ apiKey: "AIzaSyBeo0xkvjSvd2ptZ48cRsMxn-MbPPYdoEk"});


app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/user",userRoutes) 
app.use("/api/v1/chatbot", chaBotRoutes)

export default app;
