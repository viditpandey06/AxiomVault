const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.signup = async (req, res) => {
    try {
        const { username, email, password, auth_provider, oauth_id, public_key, encrypted_private_key } = req.body;

        // Check if user already exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ error: 'User already exists' });
        }

        let password_hash = undefined;
        if (auth_provider === 'local') {
            if (!password) {
                return res.status(400).json({ error: 'Password is required for local authentication' });
            }
            const salt = await bcrypt.genSalt(10);
            password_hash = await bcrypt.hash(password, salt);
        }

        user = new User({
            username,
            email,
            auth_provider,
            password_hash,
            oauth_id: auth_provider === 'google' ? oauth_id : null,
            public_key,
            encrypted_private_key
        });

        await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                public_key: user.public_key,
                encrypted_private_key: user.encrypted_private_key,
                trust_score: user.trust_score
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, auth_provider, oauth_id } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        if (user.auth_provider !== auth_provider) {
            return res.status(400).json({ error: `Please login with ${user.auth_provider}` });
        }

        if (auth_provider === 'local') {
            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
        } else if (auth_provider === 'google') {
            if (user.oauth_id !== oauth_id) {
                return res.status(400).json({ error: 'Invalid OAuth ID' });
            }
        }

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                public_key: user.public_key,
                encrypted_private_key: user.encrypted_private_key,
                trust_score: user.trust_score
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        res.json({ user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
};
