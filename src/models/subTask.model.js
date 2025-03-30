import mongoose, { Schema } from "mongoose";

const subTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      lowrcase: true,
    },
    task: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

export const SubTask = mongoose.model("SubTask", subTaskSchema);
