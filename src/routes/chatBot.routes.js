import express from "express";
import { getSqlQuery, langChainOutput, seedDb } from "../controllers/chatBot.controllers.js";


const router = express.Router();

router.post("/", getSqlQuery);
router.post("/lang", langChainOutput);
router.get("/seed", seedDb); 


export default router;