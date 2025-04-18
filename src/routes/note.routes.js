import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
import { createNote } from "../controllers/note.controllers.js";

const router = Router();

router.route("/create-note/:projectId").post(isLoggedIn, createNote);

export default router;
