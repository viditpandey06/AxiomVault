const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// Google OAuth — handles both signup (new user) and login (existing user)
exports.googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ error: 'Google credential is required' });
        }

        // Verify the Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email, name } = payload;

        let user = await User.findOne({ email });

        if (user) {
            // Existing user — enforce provider lock
            if (user.auth_provider !== 'google') {
                return res.status(400).json({ error: 'This email uses password authentication. Please login with email and password.' });
            }

            const token = generateToken(user._id);

            // If user has keys, it's a full login
            if (user.public_key && user.encrypted_private_key) {
                return res.json({
                    token,
                    isNewUser: false,
                    user: {
                        _id: user._id,
                        username: user.username,
                        email: user.email,
                        public_key: user.public_key,
                        encrypted_private_key: user.encrypted_private_key,
                        trust_score: user.trust_score
                    }
                });
            }

            // User exists but keys not yet set (interrupted signup)
            return res.json({
                token,
                isNewUser: true,
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    trust_score: user.trust_score
                }
            });
        }

        // New user — create account without keys
        user = new User({
            username: name || email.split('@')[0],
            email,
            auth_provider: 'google',
            oauth_id: googleId,
            public_key: '',
            encrypted_private_key: ''
        });

        await user.save();

        const token = generateToken(user._id);

        res.status(201).json({
            token,
            isNewUser: true,
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                trust_score: user.trust_score
            }
        });
    } catch (err) {
        console.error('Google auth error:', err);
        res.status(500).json({ error: 'Google authentication failed' });
    }
};

// Complete Google signup — set E2EE keys after passphrase entry
exports.setKeys = async (req, res) => {
    try {
        const { public_key, encrypted_private_key } = req.body;

        if (!public_key || !encrypted_private_key) {
            return res.status(400).json({ error: 'Keys are required' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { public_key, encrypted_private_key } },
            { new: true }
        );

        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
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
        console.error('Set keys error:', err);
        res.status(500).json({ error: 'Server error' });
    }
};
