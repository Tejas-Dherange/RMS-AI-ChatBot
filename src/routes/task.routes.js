import { Router } from "express";
import {
  createSubTask,
  createTask,
  deleteSubTask,
  deleteTask,
  editTask,
  getTaskById,
  getTasks,
  updateStatus,
  updateSubtaskStatus,
} from "../controllers/task.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/create-task").post(isLoggedIn, createTask);
router.route("/edit-task/:taskId").post(isLoggedIn, editTask);
router.route("/update-status/:taskId").post(isLoggedIn, updateStatus);
router.route("/delete-task/:taskId").delete(isLoggedIn, deleteTask);
router.route("/get-tasks").get(isLoggedIn, getTasks);
router.route("/get-task/:taskId").get(isLoggedIn, getTaskById);
router.route("/create-subtask/:taskId").post(isLoggedIn, createSubTask);
router.route("/delete-subtask/:subTaskId").delete(isLoggedIn, deleteSubTask);
router.route("/update-subtask-status/:subTaskId").post(isLoggedIn, updateSubtaskStatus);

export default router;
