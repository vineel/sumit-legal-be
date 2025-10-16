const express = require('express');
const router = express.Router();
const controller = require('../controller/auth.controller');

 

const { authMiddleware } = require('../middleware/auth');

router.post('/signup', controller.signup);
router.post('/signin', controller.signin);
router.get('/me', authMiddleware, controller.getMe);



module.exports = router;
