import { ApiResponse } from "../utils/api-response.utils.js";

const healthCheckRouter = async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, {
      message: "Server is running",
    }),
  );
};

export { healthCheckRouter };
