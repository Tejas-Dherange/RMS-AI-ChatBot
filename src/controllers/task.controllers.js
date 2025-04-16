import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/api-error.utils.js";
import { ApiResponse } from "../utils/api-response.utils.js";
import { asyncHandler } from "../utils/async-handler.utils.js";
import { AvailableTaskStatus, taskStatusEnum } from "../utils/constant.js";

const createTask = asyncHandler(async (req, res) => {
  const { title, description, assignedTo, projectId } = req.body;

  if (!title) {
    throw new ApiError(400, "title is rrequired");
  }

  const id = req.user?._id;

  console.log(id);

  if (!id) {
    throw new ApiError(400, "logged in to create task");
  }

  const task = await Task.create({
    title,
    description,
    assignedTo,
    project: projectId,
    assignedBy: id,
  });

  if (!task) {
    throw new ApiError(400, "error in creating task");
  }

  return res.status(200).json(
    new ApiResponse(200, "task creted successfully", {
      task,
    }),
  );
});

const editTask = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const { taskId } = req.params;

  const id = req.user?._id;

  console.log(id);

  if (!id) {
    throw new ApiError(400, "logged in to edit task");
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(400, "error in editing task");
  }

  task.title = title;
  task.description = description;

  await task.save();

  return res.status(200).json(
    new ApiResponse(200, "task updated successfully", {
      task,
    }),
  );
});

const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { taskId } = req.params;

  if (!status || !taskId) {
    throw new ApiError(400, "some error occured");
  }

  const task = await Task.findById(taskId);

  if (!task) {
    throw new ApiError(400, "error in fetching task");
  }

  console.log(AvailableTaskStatus.indexOf(status.toLowerCase()));

  if (AvailableTaskStatus.includes(status.toLowerCase())) {
    task.status =
      AvailableTaskStatus[AvailableTaskStatus.indexOf(status.toLowerCase())];

    await task.save();
  } else {
    throw new ApiError(400, "invalid status");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "task status updated succesfully"));
});

export { createTask, editTask, updateStatus };
