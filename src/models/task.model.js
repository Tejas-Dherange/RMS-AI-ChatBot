import mongoose, { Schema } from "mongoose";
import { AvailableUserRoles, userRolesEnum } from "../utils/constant.js";
const taskSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },
    description: {
      type: String,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: userRolesEnum,
      default: AvailableUserRoles.TODO,
    },
    attachMents: {
      type: [
        {
          url: String,
          mimetype: String,
          size: Number,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Task = mongoose.model("Task", taskSchema);
