const mongoose = require("mongoose");

const templateSchema = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    templatename: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    // New nested clause structure
    clauses: [
      {
        clause_name: {
          type: String,
          required: true,
          trim: true,
        },
        variants: [
          {
            variant_label: {
              type: String,
              required: true,
              trim: true,
            },
            text: {
              type: String,
              required: true,
            },
            best_used_when: {
              type: String,
              required: false,
              trim: true,
              default: "",
            },
          },
        ],
      },
    ],
    // Global questions for users
    global_questions: [
      {
        question: {
          type: String,
          required: true,
          trim: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Legacy support - keep old structure for backward compatibility
    legacyClauses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Clause",
      },
    ],
    isCustom: { type: Boolean, default: false }, 
    active: {
      type: Boolean,
      default: true,
    },
    version: {
      type: String,
      default: "1.0",
    },
    createdby: {
      type: String,
      default: "admin",
    },
    templatefile: {
      type: String, // just store the S3 file URL
      required: false,
    },
  },
  
  { timestamps: true }
);

module.exports = mongoose.model("Template", templateSchema);
