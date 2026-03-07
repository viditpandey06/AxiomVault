const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.post('/set-keys', authMiddleware, authController.setKeys);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
