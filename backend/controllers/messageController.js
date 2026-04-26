const Message = require('../models/Message');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
    try {
        const { senderId, recipientId, content } = req.body;
        
        if (!senderId || !recipientId || !content) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const newMessage = new Message({
            sender: senderId,
            recipient: recipientId,
            content
        });

        await newMessage.save();
        res.status(201).json({ success: true, data: newMessage });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getConversations = async (req, res) => {
    try {
        const { userId, otherId } = req.params;
        
        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: otherId },
                { sender: otherId, recipient: userId }
            ]
        }).sort({ timestamp: 1 });

        res.json({ success: true, data: messages });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getAdminId = async (req, res) => {
    try {
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
        res.json({ success: true, adminId: admin._id });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getExpertContacts = async (req, res) => {
    try {
        // Return ALL approved experts so admin can message anyone
        const experts = await User.find({ role: 'expert', approved: true })
            .select('name email role profilePic specialization')
            .lean()

        // Also get admin id
        const admin = await User.findOne({ role: 'admin' }).lean()
        
        // For each expert, get latest message + unread count
        const enriched = await Promise.all(experts.map(async (expert) => {
            if (!admin) return { ...expert, lastMessage: null, unreadCount: 0 }
            
            const lastMsg = await Message.findOne({
                $or: [
                    { sender: expert._id, recipient: admin._id },
                    { sender: admin._id, recipient: expert._id }
                ]
            }).sort({ timestamp: -1 }).lean()
            
            const unreadCount = await Message.countDocuments({
                sender: expert._id, recipient: admin._id, isRead: false
            })
            
            return { ...expert, lastMessage: lastMsg?.content || null, lastTime: lastMsg?.timestamp || null, unreadCount }
        }))

        res.json({ success: true, data: enriched })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
};

exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndDelete(id);
        res.json({ success: true, message: 'Message deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/messages/contacts/:userId
// Returns admin + all other approved experts (so expert can message everyone)
exports.getMyContacts = async (req, res) => {
    try {
        const { userId } = req.params

        // Get all experts (except self) + admin
        const contacts = await User.find({
            _id: { $ne: userId },
            $or: [{ role: 'admin' }, { role: 'expert', approved: true }]
        }).select('name email role profilePic specialization').lean()

        // Enrich with last message and unread count
        const enriched = await Promise.all(contacts.map(async (contact) => {
            const lastMsg = await Message.findOne({
                $or: [
                    { sender: userId, recipient: contact._id },
                    { sender: contact._id, recipient: userId }
                ]
            }).sort({ timestamp: -1 }).lean()

            const unreadCount = await Message.countDocuments({
                sender: contact._id,
                recipient: userId,
                isRead: false
            })

            return {
                ...contact,
                lastMessage: lastMsg?.content || null,
                lastTime: lastMsg?.timestamp || null,
                unreadCount
            }
        }))

        // Sort: contacts with messages first, then by last message time
        enriched.sort((a, b) => {
            if (a.lastTime && b.lastTime) return new Date(b.lastTime) - new Date(a.lastTime)
            if (a.lastTime) return -1
            if (b.lastTime) return 1
            // Admin first among contacts with no messages
            if (a.role === 'admin') return -1
            if (b.role === 'admin') return 1
            return 0
        })

        res.json({ success: true, data: enriched })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}

// PUT /api/messages/:id/read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params
        await Message.findByIdAndUpdate(id, { isRead: true })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ success: false, message: err.message })
    }
}

