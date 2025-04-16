import { Router } from "express";
import { createTask, editTask, updateStatus } from "../controllers/task.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create-task").post(isLoggedIn,createTask);
router.route("/edit-task/:taskId").post(isLoggedIn,editTask);
router.route("/update-status/:taskId").post(isLoggedIn,updateStatus);

export default router;
