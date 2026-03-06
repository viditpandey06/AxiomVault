const mongoose = require('mongoose');

const metadataLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    message_rate_per_min: { type: Number, default: 0 },
    unique_receivers_24h: { type: Number, default: 0 },
    ip_changes_7d: { type: Number, default: 0 },
    reports_received: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MetadataLog', metadataLogSchema);
