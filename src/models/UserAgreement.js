const mongoose = require("mongoose");

const clauseSchema = new mongoose.Schema({
  clauseId: { type: mongoose.Schema.Types.ObjectId, ref: "Clause", required: true },
  partyAPreference: {
    type: String,
    enum: ["preferred", "acceptable", "unacceptable"],
    default: null
  },
  partyBPreference: {
    type: String,
    enum: ["preferred", "acceptable", "unacceptable"],
    default: null
  }
});

const chatMessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  senderRole: { type: String, enum: ["partyA", "partyB"], required: true },
  isRead: { type: Boolean, default: false },
  readBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    readAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

const userAgreementSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Party A
    partyBUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Party B
    partyBEmail: { type: String }, // Email for invitation
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: true },
    clauses: [clauseSchema],
    status: {
      type: String,
      enum: ["invited", "accepted", "in-progress", "completed", "signed", "rejected"],
      default: "invited"
    },
    effectiveDate: Date,
    termDuration: String,
    jurisdiction: String,
    signedDate: Date,
    // Signature fields
    partyASignature: { type: String }, // Base64 signature data
    partyBSignature: { type: String },
    partyASignedDate: Date,
    partyBSignedDate: Date,
    partyASigned: { type: Boolean, default: false }, // Boolean flag for Party A signed
    partyBSigned: { type: Boolean, default: false }, // Boolean flag for Party B signed
    // Additional party information
    partyAName: String,
    partyBName: String,
    partyAEmail: String,
    partyBEmail: String,
    partyAAddress: String,
    partyBAddress: String,
    partyAPhone: String,
    partyBPhone: String,
    // Chat messages array
    chatMessages: [chatMessageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserAgreement", userAgreementSchema);
