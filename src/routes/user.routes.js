const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const {uploadUserMedia } = require('../middleware/upload');
 

 const controller = require('../controller/user.controller');

const router = express.Router();



router.put("/update", authMiddleware, uploadUserMedia, controller.updateUser);

// Get user templates
router.get("/templates", authMiddleware, controller.getUserTemplates);

// Get user profile
router.get("/profile", authMiddleware, controller.getUserProfile);

// Upload signature
router.post("/upload-signature", authMiddleware, uploadUserMedia, controller.uploadSignature);

// Get user statistics
router.get("/statistics", authMiddleware, controller.getUserStatistics);

// Test S3 configuration (for debugging)
router.get("/test-s3-config", authMiddleware, controller.testS3Config);

module.exports = router;
