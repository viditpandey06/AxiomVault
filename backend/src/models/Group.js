const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    group_name: { type: String, required: true },
    admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', groupSchema);
