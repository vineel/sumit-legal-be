const express = require('express');
const router = express.Router();
const adminController = require('../controller/admin.controller');
const { authMiddleware } = require('../middleware/auth');

router.get('/allusers', adminController.getAllUsers);
router.get('/dashboardstatus', adminController.getDashboardStats);
router.get('/search', adminController.searchUsers);
router.put('/updateuser/:id', adminController.updateUser);
router.delete('/deleteUser/:id', adminController.deleteUser);
router.post('/generate', adminController.generateText);
router.get('/allactivitylogs', adminController.getAllActivityLogs);
router.get('/agreements', authMiddleware, adminController.getAllAgreements);

// User management routes (all with authentication)
router.get('/users', authMiddleware, adminController.getAllUsersForAdmin);
router.get('/pending-users', authMiddleware, adminController.getPendingUsers);
router.put('/approve-user/:id', authMiddleware, adminController.approveUser);
router.put('/reject-user/:id', authMiddleware, adminController.rejectUser);
router.delete('/deleteUser/:id', authMiddleware, adminController.deleteUser);

// Template management routes
router.get('/templates', authMiddleware, adminController.getTemplates);
router.get('/template/single/:id', authMiddleware, adminController.getTemplateById);
router.post('/templates', authMiddleware, adminController.createTemplate);
router.put('/templates/:id', authMiddleware, adminController.updateTemplate);

// Clause management routes
router.get('/clauses', authMiddleware, adminController.getClauses);
router.post('/clauses', authMiddleware, adminController.createClause);
router.put('/clauses/:id', authMiddleware, adminController.updateClause);
router.delete('/clauses/:id', authMiddleware, adminController.deleteClause);

module.exports = router;