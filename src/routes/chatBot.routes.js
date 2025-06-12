import express from "express";
import { getSqlQuery } from "../controllers/chatBot.controllers.js";


const router = express.Router();

router.post("/", getSqlQuery);


export default router;