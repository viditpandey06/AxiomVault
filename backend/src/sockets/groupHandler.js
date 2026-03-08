const Group = require('../models/Group');
const GroupMessage = require('../models/GroupMessage');
const GroupKey = require('../models/GroupKey');
const User = require('../models/User');
const { redisClient } = require('../config/redis');
const aiService = require('../services/aiModeration');

module.exports = (io, socket) => {
    // Join all user's group rooms
    socket.on('join_groups', async () => {
        try {
            const groups = await Group.find({ members: socket.user._id });
            groups.forEach(group => {
                socket.join(`group_${group._id}`);
            });
        } catch (err) {
            console.error('Error joining groups', err);
        }
    });

    // Create Group
    socket.on('create_group', async (data, callback) => {
        try {
            const { group_name, members, keys } = data;
            // keys: [{ user_id, encrypted_group_key }]

            const group = new Group({
                group_name,
                admin_id: socket.user._id,
                members: [...members, socket.user._id]
            });
            await group.save();

            // Save keys
            const groupKeys = keys.map(k => ({
                group_id: group._id,
                user_id: k.user_id,
                encrypted_group_key: k.encrypted_group_key
            }));
            await GroupKey.insertMany(groupKeys);

            socket.join(`group_${group._id}`);

            // Notify other members
            members.forEach(async (memberId) => {
                if (memberId.toString() !== socket.user._id.toString()) {
                    const memberSocketId = await redisClient.get(`user_socket:${memberId}`);
                    if (memberSocketId) {
                        io.to(memberSocketId).emit('group_added', group);
                    }
                }
            });

            callback({ status: 'ok', group });
        } catch (err) {
            console.error(err);
            callback({ status: 'error', error: err.message });
        }
    });

    // Send Group Message
    socket.on('send_group_message', async (data, callback) => {
        try {
            const { group_id, ciphertext } = data;

            const message = new GroupMessage({
                group_id,
                sender_id: socket.user._id,
                ciphertext,
                timestamp: new Date()
            });
            await message.save();

            // Broadcast to room
            socket.to(`group_${group_id}`).emit('receive_group_message', message);

            callback({ status: 'ok', message });

            // BACKGROUND: AI Moderation (Detached from main thread)
            setTimeout(async () => {
                try {
                    const spamScore = await aiService.analyzeUserMetadata(socket.user._id);
                    const user = await User.findById(socket.user._id);

                    // Apply penalty if spammy (up to 20 pts per message)
                    const penalty = Math.round(spamScore * 20);
                    if (penalty > 0) {
                        user.trust_score = Math.max(0, user.trust_score - penalty);
                    }

                    // Gradual recovery: +2 points per normal message (spamScore < 0.2)
                    if (spamScore < 0.2 && user.trust_score < 100) {
                        user.trust_score = Math.min(100, user.trust_score + 2);
                    }

                    await user.save();

                    // Always emit so frontend UI stays synced
                    socket.emit('trust_score_updated', { trust_score: user.trust_score });
                } catch (aiErr) {
                    console.error("Background AI processing error:", aiErr);
                }
            }, 0);

        } catch (err) {
            console.error(err);
            callback({ status: 'error', error: err.message });
        }
    });
};
