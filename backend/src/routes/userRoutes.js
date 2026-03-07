const express = require('express');
const router = express.Router();
const multer = require('multer');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Multer config: store in memory buffer, 2MB limit, images only
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

router.get('/search', authMiddleware, userController.searchUsers);
router.get('/chats', authMiddleware, userController.getUserChats);
router.get('/messages/:id', authMiddleware, userController.getChatHistory);
router.get('/profile', authMiddleware, userController.getProfile);
router.get('/profile/:id', authMiddleware, userController.getUserProfileById);
router.put('/profile', authMiddleware, userController.updateProfile);
router.post('/profile/photo', authMiddleware, upload.single('photo'), userController.uploadPhoto);
router.get('/:id/public_key', authMiddleware, userController.getPublicKey);

module.exports = router;
