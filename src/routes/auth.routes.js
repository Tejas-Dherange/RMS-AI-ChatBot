import express from "express";
// import {
//   forgotPasswordRequest,
//   getCurrentUser,
//   loginUser,
//   logoutUser,
//   registerUser,
//   resendVerifyEmail,
//   resetforgotPassword,
//   verifyEmail,
// } from "../controllers/auth.controllers.js";
import { validate } from "../middlewares/validate.middleware.js";
import { userRegistrationValidator } from "../validators/index.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = express.Router();

// router
//   .route("/register")
//   .post(userRegistrationValidator(), validate, registerUser);
// router.route("/login").post(userRegistrationValidator(), validate, loginUser);
// router.route("/verify/:token").get(verifyEmail);
// router.route("/resendVerifyEmail").post(resendVerifyEmail);
// router.route("/logout").get(isLoggedIn, logoutUser);
// router.route("/forgot-request").post(forgotPasswordRequest);
// router.route("/reset-forgot-password/:token").post(resetforgotPassword);
// router.route("/me").get(isLoggedIn, getCurrentUser);

export default router;