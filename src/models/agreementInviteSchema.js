const mongoose = require("mongoose");

const agreementInviteSchema = new mongoose.Schema(
  {
    inviterId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    }, // Party A user

    inviteeEmail: { 
      type: String, 
      required: true, 
      trim: true 
    }, // Party B email

    agreementId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "UserAgreement", 
      required: true 
    }, // Reference to draft agreement

    token: { 
      type: String, 
      required: true, 
      unique: true 
    }, // Secure invite token

    status: { 
      type: String, 
      enum: ["pending", "accepted", "expired"], 
      default: "pending" 
    },

    expiresAt: { 
      type: Date, 
      default: () => new Date(+new Date() + 7*24*60*60*1000) // 7 days expiry
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AgreementInvite", agreementInviteSchema);
