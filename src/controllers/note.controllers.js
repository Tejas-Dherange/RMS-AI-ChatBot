import { Notes } from "../models/notes.model.js";
import { ApiError } from "../utils/api-error.utils.js";
import { ApiResponse } from "../utils/api-response.utils.js";
import { asyncHandler } from "../utils/async-handler.utils.js";

const createNote = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(404, "content is required");
  }

  const { projectId } = req.params;
  const id = req.user?._id;
  if (!projectId) {
    return res
      .status(401)
      .json(new ApiError(401, "create project to create note"));
  }

  const note = await Notes.create({
    content,
    createdBy: id,
    project: projectId,
  });

  if (!note) {
    throw new ApiError(400, "error in creating note");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "note created successfully"));
});

export { createNote };
