import express from "express";
import { createProject } from "../controllers/project.controllers.js";

  
const router=express.Router();



router.route("/createProject").post(createProject)


export default router;
