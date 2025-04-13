import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/api-response.utils.js";
import { asyncHandler } from "../utils/async-handler.utils.js";
import { ApiError } from "../utils/api-error.utils.js";
import { emailVerificationMailgenContent, sendMail } from "../utils/mail.js";
import crypto from "crypto";

const registerUser = asyncHandler(async (req, res) => {
  //take data from user
  //validate data
  //check data exists in database or not
  //if not then save into database
  //create verification token
  //save token into datbase
  //send token to user

  //send  succesful message to user
  // console.log(req.body);

  const { email, username, password, role, fullname } = req.body;

  if (!email || !username || !password || !fullname || !role) {
    res.status(400).json(new ApiError(400, "all field are required"));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400).json(new ApiError(400, "User already exists"));
  }

  const user = await User.create({
    username,
    email,
    password,
    fullname,
  });

  if (!user) {
    throw new ApiError(400, "User creation failed");
  }

  // console.log(user);
  //
  const { unHashedToken, hashedToken, tokenExpiry } =
    await user.temporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  await user.save();

  const options = {
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/user/verify/${unHashedToken}`,
    ),
    email: user.email,
    subject: "Verify your account",
  };

  //sending verification email
  await sendMail(options);

  return res
    .status(200)
    .json(new ApiResponse(200, "User registered succesfully"));
  //validation by express validator
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password) {
    res.status(400).json(new ApiError(400, "All field are required"));
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400).json(new ApiError(400, "Invalid username or password"));
  }

  const isMatched = await user.isPasswordCorrect(password);
  console.log(isMatched);

  if (!isMatched) {
    return res
      .status(400)
      .json(new ApiError(400, "Invalid username or password"));
  }

  //todo : check access token and refresh token
  console.log(user);

  const accessToken = await user.generateAccesToken();
  const refreshToken = await user.generaterefereshToken();

  const cookieOptions = {
    httpOnly: false, // Set to false for testing
    secure: false, // Set to false for local development
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  };

  res.cookie("token", accessToken, cookieOptions);

  console.log("Cookie", res.getHeaders());

  user.refreshToken = refreshToken;

  await user.save();

  return res.status(200).json(
    new ApiResponse(200, "User logged in successfully", {
      id: user._id,
      name: username,
      email: email,
    }),
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      path: "/",
      expires: new Date(0), // This will make the cookie expire immediately
    });

    res.status(200).json(new ApiResponse(200, "User logged out successfully"));
  } catch (error) {
    res.status(400).json(new ApiError(500, "error occured during logout"));
  }
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    res.status(400).json(new ApiError(400, "Some error occured"));
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  // console.log(hashedToken);

  const user = await User.findOne({ emailVerificationToken: hashedToken });

  if (!user) {
    res.status(400).json(new ApiError(400, "User does not exists"));
  }

  console.log(user);

  if (user.emailVerificationTokenExpiry <= Date.now()) {
    res.status(400).json(new ApiError(400, "Verification url is expired"));
  }
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpiry = undefined;

  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, "User verified successfully"));
});

const resendVerifyEmail = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;

  if (!email) {
    res.status(400).json(new ApiError(400, "Invalid credentials"));
  }
  const user = await User.findOne({ email });
  if (!user) {
    res.status(400).json(new ApiError(400, "User not found"));
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    await user.temporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpiry = tokenExpiry;

  const options = {
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/user/verify/${unHashedToken}`,
    ),
    email: user.email,
    subject: "Verify your account",
  };

  //sending verification email
  await sendMail(options);

  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, "Resend verify mail successfully"));
});

const resetforgotPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    res.status(500).json(new ApiError(500, "Some error occurred"));
  }
  console.log("Reset password token", token);
  console.log(password);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  console.log(hashedToken);

  const user = await User.findOne({ forgotPasswordToken: hashedToken });

  if (!user) {
    res.status(400).json(new ApiError(400, "User Not Found"));
  }
  console.log(user);

  user.password = password;
  user.forgotPasswordToken = undefined;
  user.forgotPasswordTokenExpiry = undefined;
  console.log(user);

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, "password reset successfully"));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json(new ApiError(400, "Enter valid cedentials"));
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(400).json(new ApiError(400, "User Not Found"));
  }

  const { unHashedToken, hashedToken, tokenExpiry } =
    await user.temporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordTokenExpiry = tokenExpiry;

  await user.save();
  const options = {
    mailgenContent: emailVerificationMailgenContent(
      user.username,
      `${process.env.BASE_URL}/api/v1/user/reset-forgot-password/${unHashedToken}`,
    ),
    email: user.email,
    subject: "Reset your password",
  };

  //sending verification email
  await sendMail(options);
  return res
    .status(200)
    .json(new ApiResponse(200, "please reset passord by link in mail"));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { email, oldpassword, password, role } = req.body;

  if (!email || !password || !oldpassword) {
    return res
      .status(500)
      .json(new ApiError(500, "all credentials are required"));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(500).json(new ApiError(500, "User not found"));
  }

  const isMatched = await user.isPasswordCorrect(oldpassword);
  if (!isMatched) {
    return res.status(500).json(new ApiError(500, "Enter valid credentials"));
  }

  user.password = password;

  await user.save();

  return res
    .status(201)
    .json(new ApiResponse(201, "pasword changed succesfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const { email, username, password, role } = req.body;
});

const getCurrentUser = asyncHandler(async (req, res) => {
  // console.log(req.user);
  const id = await req.user?._id;

  if (!id) {
    return res
      .status(400)
      .json(new ApiError(400, "Some error occured in fetching user"));
  }

  //finding user in database
  const user = await User.findById(id).select(
    "-password -isEmailVerified -refreshToken",
  );
  // console.log(user);

  if (!user) {
    return res.status(400).json(new ApiError(400, "User not found"));
  }

  return res.status(201).json(
    new ApiResponse(201, "Fetched user Successfully", {
      id: user._id,
      name: user.username,
      email: user.email,
      fullname: user.fullname,
      avatar: user.avatar,
    }),
  );
});


export {
  registerUser,
  loginUser,
  logoutUser,
  resendVerifyEmail,
  refreshAccessToken,
  verifyEmail,
  resetforgotPassword,
  forgotPasswordRequest,
  changeCurrentPassword,
  getCurrentUser,
};
