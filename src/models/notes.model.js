import mongoose, { Schema } from "mongoose";

const notesSchema = new Schema(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const Notes = mongoose.model("Notes", notesSchema);
