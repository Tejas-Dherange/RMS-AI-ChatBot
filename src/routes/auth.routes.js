import express from "express";
import { registerUser } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validate.middleware.js";
import { userRegistrationValidator } from "../validators/index.js";

const router = express.Router();

router
  .route("/register")
  .post(userRegistrationValidator(), validate, registerUser);

export default router;
