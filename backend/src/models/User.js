const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    auth_provider: { type: String, enum: ['local', 'google'], required: true },
    password_hash: { type: String, required: function () { return this.auth_provider === 'local'; } },
    oauth_id: { type: String, default: null },
    public_key: { type: String, default: '' },
    encrypted_private_key: { type: String, default: '' },
    trust_score: { type: Number, default: 100 },
    profile_photo: { type: String, default: '' },
    status: { type: String, maxlength: 100, default: '' },
    age: { type: Number, default: null },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say', null], default: null },
    bio: { type: String, maxlength: 200, default: '' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);
