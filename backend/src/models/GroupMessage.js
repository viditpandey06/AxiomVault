const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ciphertext: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    reactions: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reaction: { type: String }
    }]
});

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
