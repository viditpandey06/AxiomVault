const mongoose = require('mongoose');

const privateMessageSchema = new mongoose.Schema({
    sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ciphertext: { type: String, required: true },
    encrypted_aes_key: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    reactions: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reaction: { type: String }
    }]
});

module.exports = mongoose.model('PrivateMessage', privateMessageSchema);
