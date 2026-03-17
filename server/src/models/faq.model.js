import mongoose from "mongoose";

const FAQSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    category: { type: String },
    status: {
      type: String,
      enum: ["published", "draft", "disabled"],
      default: "published",
    },
    // this is for drag and drop reordering in super-admin dashboard
    order: {
      type: Number,
      default: 0,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    versionHistory: {
      type: [
        {
          version: { type: Number, required: true },
          question: { type: String, required: true },
          answer: { type: String, required: true },
          category: { type: String, default: "" },
          status: {
            type: String,
            enum: ["published", "draft", "disabled"],
            default: "published",
          },
          changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
          },
          changedAt: { type: Date, default: Date.now },
        },
      ],
      default: () => [],
    },
  },
  { timestamps: true },
);

export const FAQ = mongoose.model("FAQ", FAQSchema);
