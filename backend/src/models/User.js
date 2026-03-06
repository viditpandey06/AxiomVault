const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    auth_provider: { type: String, enum: ['local', 'google'], required: true },
    password_hash: { type: String, required: function () { return this.auth_provider === 'local'; } },
    oauth_id: { type: String, default: null },
    public_key: { type: String, required: true },
    encrypted_private_key: { type: String, required: true },
    trust_score: { type: Number, default: 100 }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);
