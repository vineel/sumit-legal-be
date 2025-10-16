const User = require('../models/User');
const UserAgreement = require('../models/UserAgreement');
const Template = require('../models/Template');
const logActivity = require('../utilites/logActivity');
const { uploadFileToS3 } = require('../utilites/s3Uploader');

// Test S3 configuration
exports.testS3Config = async (req, res) => {
  try {
    const config = {
      AWS_REGION: process.env.AWS_REGION,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'legal-collab-media'
    };
    
    console.log('S3 Configuration:', config);
    res.json({ 
      message: 'S3 configuration check',
      config 
    });
  } catch (error) {
    console.error('Error checking S3 config:', error);
    res.status(500).json({ message: 'Error checking S3 config', error: error.message });
  }
};

// 👉 Update user profile
exports.updateUser = async (req, res) => {
  try {
    const userId = req.user.id; // from authMiddleware
    const updates = {};
   console.log(req.body,"body>>");
    // Handle text fields (form-data text comes in req.body)
    if (req.body.name) updates.name = req.body.name;
    if (req.body.status) updates.status = req.body.status;

    // Address (optional, form-data keys) - always update address object
    updates.address = {
      street: req.body.street || '',
      city: req.body.city || '',
      state: req.body.state || '',
      postalCode: req.body.postalCode || '',
      country: req.body.country || '',
    };

    // Handle uploaded files with S3 upload
    if (req.files && req.files.photo) {
      try {
        const photoFile = req.files.photo[0];
        console.log('Photo file details:', {
          originalname: photoFile.originalname,
          mimetype: photoFile.mimetype,
          size: photoFile.size,
          hasBuffer: !!photoFile.buffer,
          bufferLength: photoFile.buffer ? photoFile.buffer.length : 0
        });
        
        if (!photoFile.buffer) {
          throw new Error('Photo file buffer is missing');
        }
        
        const photoUrl = await uploadFileToS3(
          photoFile.buffer,
          photoFile.originalname,
          photoFile.mimetype,
          userId,
          'photo'
        );
        updates["photo.url"] = photoUrl;
      } catch (error) {
        console.error('Error uploading photo:', error);
        throw new Error(`Failed to upload photo: ${error.message}`);
      }
    }
    
    if (req.files && req.files.signature) {
      try {
        const signatureFile = req.files.signature[0];
        console.log('Signature file details:', {
          originalname: signatureFile.originalname,
          mimetype: signatureFile.mimetype,
          size: signatureFile.size,
          hasBuffer: !!signatureFile.buffer,
          bufferLength: signatureFile.buffer ? signatureFile.buffer.length : 0
        });
        
        if (!signatureFile.buffer) {
          throw new Error('Signature file buffer is missing');
        }
        
        const signatureUrl = await uploadFileToS3(
          signatureFile.buffer,
          signatureFile.originalname,
          signatureFile.mimetype,
          userId,
          'signature'
        );
        updates["signature.url"] = signatureUrl;
      } catch (error) {
        console.error('Error uploading signature:', error);
        throw new Error(`Failed to upload signature: ${error.message}`);
      }
    }
    
    if (req.files && req.files.file) {
      try {
        const file = req.files.file[0];
        console.log('File details:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer,
          bufferLength: file.buffer ? file.buffer.length : 0
        });
        
        if (!file.buffer) {
          throw new Error('File buffer is missing');
        }
        
        const fileUrl = await uploadFileToS3(
          file.buffer,
          file.originalname,
          file.mimetype,
          userId,
          'file'
        );
        updates.uploadedFile = fileUrl;
      } catch (error) {
        console.error('Error uploading file:', error);
        throw new Error(`Failed to upload file: ${error.message}`);
      }
    }

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) return res.status(404).json({ message: "User not found" });

    // ✅ Log the user profile update
    await logActivity({
      usr_id: userId,
      type: 'profile_updated',
      description: `User profile updated: ${user.name}`
    });

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get user templates (public templates)
exports.getUserTemplates = async (req, res) => {
  try {
    const templates = await Template.find({ active: true })
      .populate('userid', 'name')
      .populate('clauses')
      .sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Upload signature only
exports.uploadSignature = async (req, res) => {
  try {
    const userId = req.user.id;
    
    if (!req.files || !req.files.signature) {
      return res.status(400).json({ message: 'Signature file is required' });
    }

    const signatureFile = req.files.signature[0];
    console.log('Signature file details:', {
      originalname: signatureFile.originalname,
      mimetype: signatureFile.mimetype,
      size: signatureFile.size,
      hasBuffer: !!signatureFile.buffer,
      bufferLength: signatureFile.buffer ? signatureFile.buffer.length : 0
    });
    
    if (!signatureFile.buffer) {
      return res.status(400).json({ message: 'Signature file buffer is missing' });
    }
    
    const signatureUrl = await uploadFileToS3(
      signatureFile.buffer,
      signatureFile.originalname,
      signatureFile.mimetype,
      userId,
      'signature'
    );
    
    const user = await User.findByIdAndUpdate(
      userId, 
      { "signature.url": signatureUrl },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Log the signature upload
    await logActivity({
      usr_id: userId,
      type: 'signature_uploaded',
      description: `User uploaded signature: ${user.name}`
    });

    res.json({ 
      message: 'Signature uploaded successfully', 
      signatureUrl,
      user 
    });
  } catch (error) {
    console.error('Error uploading signature:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Import Agreement model
    const Agreement = require('../models/Agreement');
    const Template = require('../models/Template');
    
    // Get agreements where user is initiator
    const agreementsCreated = await Agreement.countDocuments({ initiatorId: userId });
    
    // Get agreements where user has signed (either as initiator or invited user)
    const agreementsSigned = await Agreement.countDocuments({
      $or: [
        { 
          initiatorId: userId, 
          'signatures.initiatorSignature.signed': true 
        },
        { 
          invitedUserId: userId, 
          'signatures.invitedUserSignature.signed': true 
        }
      ]
    });
    
    // Get unique templates used by the user (templates from agreements they've been part of)
    const templatesUsed = await Agreement.distinct('templateId', {
      $or: [
        { initiatorId: userId },
        { invitedUserId: userId }
      ]
    });
    
    const templatesUsedCount = templatesUsed.length;
    
    // Get additional statistics
    const totalAgreementsParticipated = await Agreement.countDocuments({
      $or: [
        { initiatorId: userId },
        { invitedUserId: userId }
      ]
    });
    
    const pendingAgreements = await Agreement.countDocuments({
      $or: [
        { initiatorId: userId },
        { invitedUserId: userId }
      ],
      status: { $in: ['pending', 'active'] }
    });
    
    const completedAgreements = await Agreement.countDocuments({
      $or: [
        { initiatorId: userId },
        { invitedUserId: userId }
      ],
      status: 'completed'
    });

    res.json({
      statistics: {
        agreementsCreated,
        agreementsSigned,
        templatesUsed: templatesUsedCount,
        totalAgreementsParticipated,
        pendingAgreements,
        completedAgreements
      }
    });
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message 
    });
  }
};