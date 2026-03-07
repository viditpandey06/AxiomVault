const Group = require('../models/Group');
const GroupKey = require('../models/GroupKey');
const PrivateMessage = require('../models/PrivateMessage');

exports.createGroup = async (req, res) => {
    try {
        const { group_name, members, keys } = req.body;
        // members: array of ObjectIds (including self)
        // keys: object mapping userId -> encrypted_group_key (base64)

        if (!group_name || !members || !keys || members.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Add creator as an admin and ensure they are in the members list
        const creatorId = req.user._id;

        const newGroup = new Group({
            group_name,
            admin_id: creatorId,
            members: members
        });

        const savedGroup = await newGroup.save();

        // Save wrapped keys for each member
        const groupKeyDocs = members.map(memberId => ({
            group_id: savedGroup._id,
            user_id: memberId,
            encrypted_group_key: keys[memberId]
        }));

        await GroupKey.insertMany(groupKeyDocs);

        res.status(201).json({ status: 'ok', group: savedGroup });
    } catch (err) {
        console.error("Create group error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getUserGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        // Find groups where user is a member
        const groups = await Group.find({ members: userId }).select('group_name admin_id created_at');
        res.json(groups);
    } catch (err) {
        console.error("Get user groups error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.getGroupMembers = async (req, res) => {
    try {
        const groupId = req.params.id;

        const group = await Group.findById(groupId).populate('members', 'username public_key trust_score');
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Return members list
        res.json({ members: group.members });
    } catch (err) {
        console.error("Get group members error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};

// Also fetch the specific encrypted AES key for the requesting user for a group
exports.getGroupKey = async (req, res) => {
    try {
        const groupId = req.params.id;
        const userId = req.user._id;

        const groupKey = await GroupKey.findOne({ group_id: groupId, user_id: userId });
        if (!groupKey) return res.status(404).json({ error: 'Key not found' });

        res.json({ encrypted_group_key: groupKey.encrypted_group_key });
    } catch (err) {
        console.error("Get group key error:", err);
        res.status(500).json({ error: 'Server error' });
    }
};
