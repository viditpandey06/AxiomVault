const User = require('../models/User');
const PrivateMessage = require('../models/PrivateMessage');
const cloudinary = require('../config/cloudinary');

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        const users = await User.find({
            username: { $regex: query, $options: 'i' }
        }).select('username public_key _id trust_score profile_photo status');

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getPublicKey = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('public_key');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ public_key: user.public_key });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserChats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all private messages where user is sender or receiver
        const messages = await PrivateMessage.find({
            $or: [{ sender_id: userId }, { receiver_id: userId }]
        }).sort({ timestamp: -1 });

        // Extract unique conversational partners
        const uniquePartners = new Set();
        const chats = [];

        for (const msg of messages) {
            const partnerId = msg.sender_id.toString() === userId.toString() ? msg.receiver_id.toString() : msg.sender_id.toString();

            if (!uniquePartners.has(partnerId)) {
                uniquePartners.add(partnerId);
                chats.push({
                    partnerId,
                    lastActivity: msg.timestamp
                });
            }
        }

        // Fetch user details for these partners
        const partnerDetails = await User.find({ _id: { $in: Array.from(uniquePartners) } })
            .select('username public_key _id profile_photo status');

        const formattedChats = chats.map(chat => {
            const user = partnerDetails.find(u => u._id.toString() === chat.partnerId);
            return {
                id: user._id,
                name: user.username,
                publicKey: user.public_key,
                profilePhoto: user.profile_photo,
                status: user.status,
                lastActivity: chat.lastActivity,
                isGroup: false
            };
        });

        res.json(formattedChats);
    } catch (err) {
        console.error("Get user chats error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getChatHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const partnerId = req.params.id;

        const messages = await PrivateMessage.find({
            $or: [
                { sender_id: userId, receiver_id: partnerId },
                { sender_id: partnerId, receiver_id: userId }
            ]
        }).sort({ timestamp: 1 }).limit(100);

        res.json(messages);

    } catch (err) {
        console.error("Get chat history error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('username email trust_score age gender bio profile_photo status created_at');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error("Get profile error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { username, age, gender, bio, status } = req.body;
        const updateData = {};

        if (username && username.trim().length > 0) updateData.username = username.trim();
        if (age !== undefined) updateData.age = age === '' ? null : Number(age);
        if (gender !== undefined) updateData.gender = gender || null;
        if (bio !== undefined) updateData.bio = (bio || '').slice(0, 200);
        if (status !== undefined) updateData.status = (status || '').slice(0, 100);

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('username email trust_score age gender bio profile_photo status created_at');

        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Username already taken' });
        }
        console.error("Update profile error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserProfileById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('username public_key _id trust_score profile_photo status age gender bio');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error("Get user profile by ID error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.uploadPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Upload buffer to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'axiomvault_profiles',
                    transformation: [
                        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(req.file.buffer);
        });

        // Save the Cloudinary URL to the user record
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { profile_photo: result.secure_url } },
            { new: true }
        ).select('profile_photo');

        res.json({ profile_photo: user.profile_photo });
    } catch (err) {
        console.error("Upload photo error:", err);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
};
