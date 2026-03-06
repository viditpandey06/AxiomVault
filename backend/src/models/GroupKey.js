const mongoose = require('mongoose');

const groupKeySchema = new mongoose.Schema({
    group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    encrypted_group_key: { type: String, required: true }
});

groupKeySchema.index({ group_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('GroupKey', groupKeySchema);
