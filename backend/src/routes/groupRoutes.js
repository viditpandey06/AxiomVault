const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware, groupController.createGroup);
router.get('/', authMiddleware, groupController.getUserGroups);
router.get('/:id/members', authMiddleware, groupController.getGroupMembers);
router.get('/:id/key', authMiddleware, groupController.getGroupKey);
router.get('/:id/messages', authMiddleware, groupController.getGroupChatHistory);

module.exports = router;
