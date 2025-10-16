const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },

    role: { type: String, enum: ['party', 'admin'], default: 'party' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

    // Profile photo (only URL)
    photo: {
      url: { type: String }  // S3 URL for profile photo
    },

    // 🏠 User Address
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },

    // ✍️ Signature (only URL)
    signature: {
      url: { type: String }  // S3 URL for signature image
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
