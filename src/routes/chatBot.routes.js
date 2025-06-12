import express from "express";
import { getSqlQuery, seedDb } from "../controllers/chatBot.controllers.js";


const router = express.Router();

router.post("/", getSqlQuery);
router.get("/seed", seedDb);


export default router;