import mongoose, { Schema } from "mongoose";
import { AvailableUserRoles, userRolesEnum } from "../utils/constant.js";
const projectMemberSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    role: {
      type: String,
      enum: userRolesEnum,
      default: AvailableUserRoles.MEMBER,
    },
  },
  { timestamps: true },
);

export const ProjectMember = mongoose.model(
  "ProjectMember",
  projectMemberSchema,
);
