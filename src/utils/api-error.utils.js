class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    stack = "",
    errors = [],
  ) {
    super(message);
    this.success = false;
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
