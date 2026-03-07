const PrivateMessage = require('../models/PrivateMessage');
const User = require('../models/User');
const { redisClient } = require('../config/redis');
const aiService = require('../services/aiModeration');

module.exports = (io, socket) => {
    // Direct Message
    socket.on('send_private_message', async (data, callback) => {
        try {
            console.log(`\n--- INCOMING MESSAGE PAYLOAD FROM: ${socket.user.username} ---`);
            const { receiver_id, ciphertext, encrypted_aes_key } = data;
            console.log(`Target Receiver ID: ${receiver_id}`);

            const message = new PrivateMessage({
                sender_id: socket.user._id,
                receiver_id,
                ciphertext,
                encrypted_aes_key,
                timestamp: new Date()
            });
            await message.save();

            // Check if receiver is online
            const receiverSocketId = await redisClient.get(`user_socket:${receiver_id}`);
            console.log(`Redis Lookup for 'user_socket:${receiver_id}': ${receiverSocketId}`);

            if (receiverSocketId) {
                console.log(`SUCCESS: Emitting to ${receiverSocketId}`);
                io.to(receiverSocketId).emit('receive_private_message', message);
            } else {
                console.log(`FAILED: Receiver ${receiver_id} is offline or not found in Redis`);
            }

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

    // Reactions format: { message_id, reaction, type: 'private' }
    socket.on('send_reaction', async (data, callback) => {
        try {
            const { message_id, reaction, type } = data;

            if (type === 'private') {
                const msg = await PrivateMessage.findById(message_id);
                if (!msg) return callback({ status: 'error' });

                // Add or update reaction
                const existing = msg.reactions.find(r => r.user_id.toString() === socket.user._id.toString());
                if (existing) {
                    existing.reaction = reaction;
                } else {
                    msg.reactions.push({ user_id: socket.user._id, reaction });
                }
                await msg.save();

                // Notify receiver
                const otherUserId = msg.sender_id.toString() === socket.user._id.toString() ? msg.receiver_id : msg.sender_id;
                const otherSocket = await redisClient.get(`user_socket:${otherUserId}`);
                if (otherSocket) {
                    io.to(otherSocket).emit('receive_reaction', { message_id, reaction, user_id: socket.user._id, type: 'private' });
                }
            }
            callback({ status: 'ok' });
        } catch (err) {
            callback({ status: 'error', error: err.message });
        }
    });
    // Trust Score Reset after Freeze
    socket.on('request_trust_reset', async (data, callback) => {
        try {
            const user = await User.findById(socket.user._id);
            if (!user) return callback({ status: 'error', error: 'User not found' });

            // Only reset if score is actually at 0 (prevents abuse)
            if (user.trust_score <= 0) {
                user.trust_score = 50; // Penalized restart
                await user.save();
            }

            callback({ status: 'ok', trust_score: user.trust_score });
        } catch (err) {
            console.error('Trust reset error:', err);
            callback({ status: 'error', error: err.message });
        }
    });
};
