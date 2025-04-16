import { asyncHandler } from "../utils/async-handler.utils.js";
import { Project } from "../models/project.model.js";
import { ApiError } from "../utils/api-error.utils.js";
import { ApiResponse } from "../utils/api-response.utils.js";
import { User } from "../models/user.model.js";
import { ProjectMember } from "../models/project_member.model.js";
const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    throw new ApiError(400, "Name is required");
  }
  const id = req.user._id;
  //   console.log(req.user);

  if (!id) {
    throw new ApiError(400, "Login first to create project");
  }

  const project = await Project.create({
    name,
    description,
    createdBy: id,
  });

  if (!project) {
    throw new ApiError(400, "Error in creating project");
  }

  return res.status(200).json(
    new ApiResponse(200, "Project created succesfully", {
      name: name,
      description: description,
    }),
  );
});

const getProjects = asyncHandler(async (req, res) => {
  const id = req.user?._id;

  if (!id) {
    throw new ApiError(400, "Login first to  get project");
  }

  const projects = await Project.find({ createdBy: id });
  //   console.log(projects);

  if (!projects) {
    throw new ApiError(401, "Projects not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "projects fetched successfully", {
      ...projects,
    }),
  );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!projectId) {
    throw new ApiError(400, "project id is required");
  }

  //   console.log(projectId);

  const project = await Project.findById(projectId).select("-createdBy");

  if (!project) {
    throw new ApiError(401, "project not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "project fetched successfully", {
      project,
    }),
  );
});

const updateProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  console.log(name, description);

  if (!name && !description) {
    throw new ApiError(400, "No updates are added");
  }

  const { projectId } = req.params;

  if (!projectId) {
    throw new ApiError(400, "project id is required");
  }

  //   console.log(projectId);

  const project = await Project.findByIdAndUpdate(projectId, {
    name,
    description,
  }).select("-createdBy");

  if (!project) {
    throw new ApiError(401, "project not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "project updated successfully", {
      project,
    }),
  );
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  if (!projectId) {
    throw new ApiError(400, "project id is required");
  }

  //   console.log(projectId);

  const project = await Project.findOneAndDelete(projectId);

  //   console.log(project);

  if (!project) {
    throw new ApiError(401, "project not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "project deleted successfully"));
});

const addMemberToProject = asyncHandler(async (req, res) => {
  const { memberId, projectId } = req.params;

  if (!memberId || !projectId) {
    throw new ApiError(400, "missing user or project id");
  }

  const id = req.user?._id;

  if (!id) {
    throw new ApiError(400, "Login first to add member");
  }

  const userRole = await User.findById(id);

  console.log(userRole.role);

  if (userRole.role !== "admin" && userRole.role !== "project_admin") {
    throw new ApiError(403, "you dont have permission to add member");
  }

  const member = await ProjectMember.create({
    user: id,
    project: projectId,
  });

  if (!member) {
    throw new ApiError("400", "error in adding memeber");
  }

  res.status(200).json(
    new ApiResponse(200, "member added succesfully", {
      member,
    }),
  );
});

const getProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    throw new ApiError(400, "project member not found");
  }

  const id = req.user?._id;

  if (!id) {
    throw new ApiError(400, "Login first to add member");
  }

  const members = await ProjectMember.find({ project: projectId });

  console.log(members);

  // if (userRole.role !== "admin" && userRole.role !== "project_admin") {
  //   throw new ApiError(403, "you dont have permission to add member");
  // }

  if (!members) {
    throw new ApiError("400", "memebers not found");
  }

  res.status(200).json(
    new ApiResponse(200, "member fetched succesfully", {
      ...members,
    }),
  );
});

const deleteMember = asyncHandler(async (req, res) => {
  const { memberId } = req.params;

  if (!memberId) {
    throw new ApiError(400, "member not found");
  }

  const id = req.user?._id;

  if (!id) {
    throw new ApiError(400, "Login first to add member");
  }

  const member = await ProjectMember.findOneAndDelete({ _id: memberId });

  console.log(member);

  // if (userRole.role !== "admin" && userRole.role !== "project_admin") {
  //   throw new ApiError(403, "you dont have permission to add member");
  // }

  if (!member) {
    throw new ApiError("400", "memeber not found");
  }

  res.status(200).json(
    new ApiResponse(200, "member deleted succesfully", {
      member,
    }),
  );
});



export {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addMemberToProject,
  getProjectMembers,
  deleteMember,
};
