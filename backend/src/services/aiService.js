const User = require('../models/User');
const MetadataLog = require('../models/MetadataLog');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

exports.analyzeUserBehavior = async (userId) => {
    try {
        const log = await MetadataLog.findOne({ user_id: userId }).sort({ timestamp: -1 });
        if (!log) return;

        const payload = {
            user_id: userId.toString(),
            message_rate_per_min: log.message_rate_per_min,
            unique_receivers_24h: log.unique_receivers_24h,
            ip_changes_7d: log.ip_changes_7d,
            reports_received: log.reports_received
        };

        const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to fetch from AI service');

        const data = await response.json();
        const { spam_score, is_anomaly } = data;

        const user = await User.findById(userId);
        if (!user) return;

        let penalty = 0;
        if (spam_score > 0.9) penalty = 40;
        else if (spam_score > 0.8 || is_anomaly) penalty = 20;

        if (penalty > 0) {
            user.trust_score = Math.max(0, user.trust_score - penalty);
            await user.save();
        }

        return { spam_score, new_trust_score: user.trust_score };
    } catch (err) {
        console.error('AI Service Error:', err.message);
    }
};
