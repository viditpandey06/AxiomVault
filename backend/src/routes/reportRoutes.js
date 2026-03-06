const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const MetadataLog = require('../models/MetadataLog');
const { analyzeUserBehavior } = require('../services/aiService');

router.post('/:userId', authMiddleware, async (req, res) => {
    try {
        const reportedUserId = req.params.userId;

        // Upsert metadata log
        let log = await MetadataLog.findOne({ user_id: reportedUserId });
        if (!log) {
            log = new MetadataLog({ user_id: reportedUserId, reports_received: 1 });
        } else {
            log.reports_received += 1;
        }
        await log.save();

        // Trigger AI analysis asynchronously
        analyzeUserBehavior(reportedUserId);

        res.json({ status: 'ok', message: 'User reported successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
