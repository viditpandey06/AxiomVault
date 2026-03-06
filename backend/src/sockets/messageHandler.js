const PrivateMessage = require('../models/PrivateMessage');
const { redisClient } = require('../config/redis');

module.exports = (io, socket) => {
    // Direct Message
    socket.on('send_private_message', async (data, callback) => {
        try {
            const { receiver_id, ciphertext, encrypted_aes_key } = data;

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
            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive_private_message', message);
            }

            callback({ status: 'ok', message });
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
};
