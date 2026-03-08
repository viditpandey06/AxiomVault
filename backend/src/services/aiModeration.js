const axios = require('axios');
const PrivateMessage = require('../models/PrivateMessage');
const GroupMessage = require('../models/GroupMessage');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

/**
 * Calculates user metadata for the past 24 hours/7 days 
 * and sends it to the Python AI service for scoring.
 * 
 * @param {string} userId - The ID of the sending user
 * @returns {Promise<number>} - The updated spam_score (0.0 to 1.0)
 */
exports.analyzeUserMetadata = async (userId) => {
    try {
        const now = new Date();
        const oneMinAgo = new Date(now.getTime() - 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Calculate message_rate_per_min (messages in the last 60 seconds)
        const privateMessagesLastMin = await PrivateMessage.countDocuments({
            sender_id: userId,
            timestamp: { $gte: oneMinAgo }
        });
        const groupMessagesLastMin = await GroupMessage.countDocuments({
            sender_id: userId,
            timestamp: { $gte: oneMinAgo }
        });
        const messagesLastMin = privateMessagesLastMin + groupMessagesLastMin;

        // 2. Calculate unique_receivers_24h
        const privateMessagesLastDay = await PrivateMessage.find({
            sender_id: userId,
            timestamp: { $gte: oneDayAgo }
        }).select('receiver_id');

        const groupMessagesLastDay = await GroupMessage.find({
            sender_id: userId,
            timestamp: { $gte: oneDayAgo }
        }).select('group_id');

        const uniqueReceivers = new Set([
            ...privateMessagesLastDay.map(m => m.receiver_id.toString()),
            ...groupMessagesLastDay.map(m => `group_${m.group_id.toString()}`)
        ]).size;

        // Note: ip_changes_7d and reports_received require more tracking. 
        // For now, we mock them to 0 as placeholders for the AI input, 
        // or you could add 'reports' to the User schema later.
        const payload = {
            user_id: userId.toString(),
            message_rate_per_min: messagesLastMin,
            unique_receivers_24h: uniqueReceivers,
            ip_changes_7d: 0,
            reports_received: 0
        };

        // Call the FastAPI Python service
        const response = await axios.post(`${AI_SERVICE_URL}/analyze`, payload);

        if (response.data && response.data.spam_score !== undefined) {
            return response.data.spam_score;
        }

        // Default if something goes wrong formatting-wise
        return 0;

    } catch (err) {
        console.error("AI Service Call Failed:", err.message);
        // Fail open: don't penalize user if AI service is down
        return 0;
    }
};
