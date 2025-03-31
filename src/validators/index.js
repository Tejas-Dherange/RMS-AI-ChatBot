import { body } from "express-validator";

const userRegistrationValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Email is invalid"),

    body("username")
      .trim()
      .notEmpty()
      .withMessage("Username is required")
      .isLength({ min: 3 })
      .withMessage("username must be greater than 3 character")
      .isLength({ max: 13 })
      .withMessage("username must be less than 14 character"),

    body("password")
      .notEmpty()
      .withMessage("password is required")
      .isLength({ min: 8 })
      .withMessage("password must be greater than 8 chracter")
      .isLength({ max: 18 })
      .withMessage("password must be less than 18 chracter"),
  ];
};

const userLoginValidator = () => {
  return [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("email is required")
      .isEmail()
      .withMessage("Invalid email"),

    body("password")
      .notEmpty()
      .withMessage("password is required")
      .isLength({ min: 8 })
      .withMessage("password must be greater than 8 chracter")
      .isLength({ max: 18 })
      .withMessage("password must be less than 18 chracter"),
  ];
};

export { userRegistrationValidator, userLoginValidator };
