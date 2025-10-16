const express = require('express');
const router = express.Router();
const agreementController = require('../controller/agreement.controller');
const { authMiddleware } = require('../middleware/auth');

// Create agreement (initiator sends invite)
router.post('/create', authMiddleware, agreementController.createAgreement);

// Update agreement (invited user responds)
router.put('/:agreementId/update', authMiddleware, agreementController.updateAgreement);

// Get agreement details
router.get('/:agreementId', authMiddleware, agreementController.getAgreement);

// Get user's agreements
router.get('/user/agreements', authMiddleware, agreementController.getUserAgreements);

// Get user's pending invites
router.get('/user/pending-invites', authMiddleware, agreementController.getPendingInvites);

// Sign agreement
router.post('/:agreementId/sign', authMiddleware, agreementController.signAgreement);

// Download agreement PDF
router.get('/:agreementId/download-pdf', authMiddleware, agreementController.downloadAgreementPDF);

// Delete agreement (only by initiator)
router.delete('/:agreementId', authMiddleware, agreementController.deleteAgreement);

module.exports = router;
