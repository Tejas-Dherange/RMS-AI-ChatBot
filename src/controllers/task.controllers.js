import { SubTask } from "../models/subTask.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/api-error.utils.js";
import { ApiResponse } from "../utils/api-response.utils.js";
import { asyncHandler } from "../utils/async-handler.utils.js";
import { AvailableTaskStatus } from "../utils/constant.js";

// creating new task
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

//edit existing task
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

//update status of a task  ---- also update status of subtasks
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

  // Todo : if tasj is done update all subtasks status to isCompleted true

  return res
    .status(200)
    .json(new ApiResponse(200, "task status updated succesfully"));
});

//delete a existing task ------- if task is deleted all subtask must be deleted
const deleteTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    throw new ApiError(400, "invalid task");
  }

  const deletedSubtask = await SubTask.deleteMany({ task: taskId });

  console.log(deletedSubtask);

  const deletedTask = await Task.findByIdAndDelete(taskId);

  if (!deletedTask) {
    throw new ApiError(404, "task not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "task deleted successfully", {
      deletedTask,
      deleteSubTask,
    }),
  );
});

//get list of all tasks
const getTasks = asyncHandler(async (req, res) => {
  const id = req.user?._id;
  if (!id) {
    throw new ApiError(400, "unauthorize access");
  }

  const tasks = await Task.find({ assignedBy: id });
  console.log(tasks);

  if (!tasks) {
    return res.status(404).json(new ApiError(404, "tasks not found"));
  }

  return res.status(200).json(
    new ApiResponse(200, "tasks fetched successfully", {
      tasks,
    }),
  );
});

//get task by particular task Id
const getTaskById = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  if (!taskId) {
    throw new ApiError(400, "error in fetching task");
  }

  const task = await Task.findById(taskId);

  if (!task) {
    return res.status(404).json(new ApiError(404, "task not found"));
  }

  return res.status(200).json(
    new ApiResponse(200, "task fetched successfully", {
      task,
    }),
  );
});

//create a subtask in Main task
const createSubTask = asyncHandler(async (req, res) => {
  const { title } = req.body;

  if (!title) {
    throw new ApiError(400, "title for subtask is required");
  }

  const { taskId } = req.params;

  if (!taskId) {
    throw new ApiError(400, "main task is required");
  }

  const user = req.user?._id;

  if (!user) {
    throw new ApiError(400, "logged in to create a subtask");
  }

  const taskStatus = await Task.findById(taskId).select("status");
  console.log(taskStatus);

  const subTask = await SubTask.create({
    title,
    task: taskId,
    isCompleted: taskStatus.status === "done",
    createdBy: user,
  });

  if (!subTask) {
    throw new ApiError(400, "error in creating subtask");
  }

  return res.status(200).json(
    new ApiResponse(200, "subtask created successfully", {
      subTask,
    }),
  );
});

//deleting subtask
const deleteSubTask = asyncHandler(async (req, res) => {
  const { subTaskId } = req.params;

  if (!subTaskId) {
    throw new ApiError(400, "some error occured in deleting subtask");
  }
  const user = req.user?._id;

  if (!user) {
    throw new ApiError(400, "logged in to create a subtask");
  }

  const deletedSubTask = await SubTask.findByIdAndDelete(subTaskId);

  if (!deletedSubTask) {
    throw new ApiError(400, "error in deleting subtask");
  }

  return res.status(200).json(
    new ApiResponse(200, "subtask deleted successfully", {
      deletedSubTask,
    }),
  );
});

const updateSubtaskStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { SubTaskId } = req.params;

  if (!status || !SubTaskId) {
    throw new ApiError(400, "some error occured");
  }

  const subTask = await SubTask.findById(SubTaskId);

  if (!subTask) {
    throw new ApiError(404, "subtask not found");
  }

  subTask.isCompleted = status;

  await subTask.save();

  // ******************************************************************************* //
  // TODO :if all subtask is completed update status of main task to be "done"

  return res
    .status(200)
    .json(new ApiResponse(200, "status updated successfully"));
});
export {
  createTask,
  editTask,
  updateStatus,
  deleteTask,
  getTasks,
  getTaskById,
  createSubTask,
  deleteSubTask,
  updateSubtaskStatus,
};
