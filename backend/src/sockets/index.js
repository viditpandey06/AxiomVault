const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

const setupSockets = (io) => {
    // Socket.io Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication error'));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('_id username');
            if (!user) return next(new Error('User not found'));

            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user.username} (${socket.id})`);

        // Map user_id to socket_id in Redis
        await redisClient.set(`user_socket:${socket.user._id}`, socket.id);
        await redisClient.sAdd('online_users', socket.user._id.toString());

        // Broadcast user online status
        socket.broadcast.emit('user_status', { userId: socket.user._id, status: 'online' });

        // Handle disconnection
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.user.username}`);
            await redisClient.del(`user_socket:${socket.user._id}`);
            await redisClient.sRem('online_users', socket.user._id.toString());
            socket.broadcast.emit('user_status', { userId: socket.user._id, status: 'offline' });
        });

        // Setup message handlers
        require('./messageHandler')(io, socket);
        require('./groupHandler')(io, socket);
    });
};

module.exports = setupSockets;
