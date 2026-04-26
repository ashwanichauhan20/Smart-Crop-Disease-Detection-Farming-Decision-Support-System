const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const newUser = new User({
        ...req.body,
        email: normalizedEmail,
        password: password.trim()
    });
    await newUser.save();

    // Create token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET || 'fasal_secret', { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        profilePic: newUser.profilePic,
        approved: newUser.approved
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log(`[Login Attempt] Email: ${normalizedEmail}`);
    // Use case-insensitive search to be safe
    const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } 
    }).select('+password');
    
    if (!user) {
      console.log(`[Login Failed] User not found: ${normalizedEmail}`);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(cleanPassword);
    console.log(`[Login Debug] Match result for ${normalizedEmail}: ${isMatch}`);
    
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fasal_secret', { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id, 
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profilePic,
        state: user.state,
        district: user.district,
        approved: user.approved,
        specialization: user.specialization,
        qualification: user.qualification
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Forgot Password Flow
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.password = newPassword;
        await user.save(); // Triggers hashing

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
