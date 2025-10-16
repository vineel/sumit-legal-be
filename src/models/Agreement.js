const mongoose = require('mongoose');

const AgreementSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    required: true
  },
  initiatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invitedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'cancelled', 'signed'],
    default: 'pending'
  },
  signatures: {
    initiatorSignature: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      signatureUrl: String
    },
    invitedUserSignature: {
      signed: {
        type: Boolean,
        default: false
      },
      signedAt: Date,
      signatureUrl: String
    }
  },
  initiatorData: {
    intakeAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    selectedClauses: [{
      clause_name: String,
      variant: {
        variant_label: String,
        text: String,
        best_used_when: String
      },
      status: {
        type: String,
        enum: ['accepted', 'rejected']
      },
      order: Number
    }],
    clauseVariantsOrder: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  invitedUserData: {
    intakeAnswers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    selectedClauses: [{
      clause_name: String,
      variant: {
        variant_label: String,
        text: String,
        best_used_when: String
      },
      status: {
        type: String,
        enum: ['accepted', 'rejected']
      },
      order: Number
    }],
    clauseVariantsOrder: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  matchingResults: [{
    clause_name: String,
    variant: {
      variant_label: String,
      text: String
    },
    initiatorStatus: {
      type: String,
      enum: ['accepted', 'rejected']
    },
    invitedUserStatus: {
      type: String,
      enum: ['accepted', 'rejected']
    },
    initiatorOrder: Number,
    invitedUserOrder: Number,
    matchStatus: {
      type: String,
      enum: ['green', 'red', 'yellow']
    },
    reason: String,
    // New fields for updated matching algorithm
    selectedVariant: {
      variant_label: String,
      text: String,
      best_used_when: String
    },
    initiatorRank: Number,
    invitedUserRank: Number,
    score: Number,
    mutuallyAcceptableVariants: [{
      variant: {
        variant_label: String,
        text: String,
        best_used_when: String
      },
      initiatorRank: Number,
      invitedUserRank: Number
    }],
    allVariants: {
      initiator: [{
        variant_label: String,
        text: String,
        best_used_when: String,
        order: Number
      }],
      invitedUser: [{
        variant_label: String,
        text: String,
        best_used_when: String,
        order: Number
      }]
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
AgreementSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Agreement', AgreementSchema);
