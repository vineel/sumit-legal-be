const mongoose = require("mongoose");

const ClauseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., Governing Law
    category: { type: String, required: true, trim: true }, // e.g., Legal, Confidentiality
    description: { type: String, trim: true }, // purpose of the clause
    required: { type: Boolean, default: false }, // if must be in all NDAs
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // usually admin
      required: true,
    },

    // New fields for clause variant
    variants: [{
      name: { type: String, required: true },  // Variant name, like "Governing Law - Version 1"
      riskLevel: { 
        type: String, 
        enum: ["low", "medium", "high"], 
        required: true 
      },
      legalText: { type: String, required: true },  
      status: {
        type: String,
        enum: ["active", "drafted", "deprecated"],
        default: "drafted"
      },
      version: {
        type: Number, 
        required: true,
        min: 1,  
      },
      isCustom: { 
      type: Boolean, 
      default: false,
    },
    }],
     isCustom: { 
      type: Boolean, 
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Clause", ClauseSchema);
