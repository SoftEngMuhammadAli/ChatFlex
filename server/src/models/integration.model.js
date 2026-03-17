import mongoose from "mongoose";

const IntegrationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "generic-webhook",
        "slack",
        "hubspot",
        "salesforce",
        "zendesk",
        "whatsapp",
        "facebook-messenger",
      ],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true, index: true },
    endpointUrl: { type: String, trim: true, default: "" },
    secret: { type: String, trim: true, default: "" },
    token: { type: String, trim: true, default: "" },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    events: [
      {
        type: String,
        trim: true,
      },
    ],
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastSyncAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true },
);

IntegrationSchema.index({ workspaceId: 1, type: 1, enabled: 1 });

export const Integration = mongoose.model("Integration", IntegrationSchema);

