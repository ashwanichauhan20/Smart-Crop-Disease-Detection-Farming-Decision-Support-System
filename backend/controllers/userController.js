const User = require('../models/User');
const mongoose = require('mongoose');

exports.getProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid User ID format' });
    }
    const updateData = req.body;

    // To ensure password hashing triggers, we use .save() if password is being updated
    // To ensure password hashing triggers, we use .save() if password is being updated
    if (updateData.newPassword) {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        // Verify old password
        if (updateData.oldPassword) {
            const isMatch = await user.comparePassword(updateData.oldPassword);
            if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid current password' });
        }
        
        // Handle password explicitly to trigger hashing
        user.password = updateData.newPassword;
        
        // Apply other updates
        Object.keys(updateData).forEach(key => {
            if (key !== 'newPassword' && key !== 'oldPassword') user[key] = updateData[key];
        });
        
        await user.save();
        return res.json({ success: true, data: user });
    }

    // Handle password explicitly if passed directly (e.g. from Admin Dashboard reset)
    if (updateData.password) {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.password = updateData.password;
        
        // Remove password from updateData so findByIdAndUpdate doesn't try to set it again
        delete updateData.password;
        
        // Apply other updates
        Object.keys(updateData).forEach(key => {
            user[key] = updateData[key];
        });
        
        await user.save();
        return res.json({ success: true, data: user });
    }

    // Standard update for other fields (more efficient)
    let updateOp = updateData;
    
    // If feedback is in the payload, push to array rather than replace
    if (updateData.feedback && Array.isArray(updateData.feedback)) {
        const feedbackItem = updateData.feedback[0]
        const { feedback: _, ...rest } = updateData
        updateOp = {}
        if (Object.keys(rest).length > 0) updateOp['$set'] = rest
        updateOp['$push'] = { feedback: feedbackItem }
        updateOp['$inc'] = { 'stats.calls': 1 }
    }
    
    const user = await User.findByIdAndUpdate(userId, updateOp, { new: true });
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalExpertsCount = await User.countDocuments({ role: 'expert', approved: true });
    
    // Get all approved experts to simulate/show online status
    const approvedExperts = await User.find({ role: 'expert', approved: true })
        .select('name specialization profilePic')
        .limit(10);

    // Get total community posts count
    const CommunityPost = require('../models/CommunityPost'); 
    let totalPosts = 0;
    try {
        totalPosts = await CommunityPost.countDocuments();
    } catch (e) {
        console.warn('CommunityPost model count failed, using 0');
    }

    res.json({
      success: true,
      data: {
        totalFarmers,
        totalExperts: totalExpertsCount,
        totalPosts,
        approvedExperts
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await User.findByIdAndDelete(userId);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
