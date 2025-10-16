 const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    usr_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    }
  }
);

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
