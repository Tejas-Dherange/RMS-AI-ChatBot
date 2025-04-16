import { Router } from "express";
import {
  addMemberToProject,
  createProject,
  deleteMember,
  deleteProject,
  getProjectById,
  getProjectMembers,
  getProjects,
  updateProject,
} from "../controllers/project.controllers.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";
// import validate from "../middlewares/validator.middleware.js";
// import {
//   projectMemberRoleValidator,
//   projectValidator,
// } from "../validators/project.validator.js";

// TODO : add project and project member validator

const router = Router();

//project routes
router.route("/create-project").post(isLoggedIn, createProject);

router.route("/").get(isLoggedIn, getProjects);

router.route("/:projectId").get(isLoggedIn, getProjectById);

router.route("/update-project/:projectId").put(isLoggedIn, updateProject);

router.route("/delete-project/:projectId").delete(isLoggedIn, deleteProject);

// //project members routes
router.route("/project-members/:projectId").get(isLoggedIn, getProjectMembers);

router
  .route("/add-member/:projectId/:memberId")
  .post(isLoggedIn, addMemberToProject);

router
  .route("/delete-member/:memberId")
  .delete(isLoggedIn, deleteMember);
// router
//   .route("/project-members/:memberId")
//   .put(
//     isLoggedIn,
//     projectMemberRoleValidator(),
//     validate,
//     updateMemberRoleHandler,
//   );

export default router;
