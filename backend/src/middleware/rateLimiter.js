const { redisClient } = require('../config/redis');

const rateLimiter = (limit, windowInSec) => {
    return async (req, res, next) => {
        try {
            const ip = req.ip;
            const key = `rate_limit:${ip}`;

            const current = await redisClient.incr(key);
            if (current === 1) {
                await redisClient.expire(key, windowInSec);
            }

            if (current > limit) {
                return res.status(429).json({ error: 'Too many requests, please try again later.' });
            }

            next();
        } catch (err) {
            console.error('Rate limiter error:', err);
            next();
        }
    };
};

module.exports = rateLimiter;
