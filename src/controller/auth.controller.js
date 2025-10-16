const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logActivity = require('../utilites/logActivity');



// Helper: generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// ✅ Signup
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'User already exists with this email.' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

      // ✅ Log signup activity
    await logActivity({
      usr_id: user._id,
      type: 'user_registered',
      description: `New user registered: ${user.name} (${user.email})`
    });

    // Emit notification to admins
    const io = req.app.get('io');
    if (io) {
      io.emit('user-registered', {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        timestamp: new Date()
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully! Your account is pending admin approval. You will receive an email notification once approved.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, status: user.status },
      status: 'pending_approval'
    });
  } catch (err) {
    console.error('Signup error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error during signup.' });
  }
};

// ✅ Signin
exports.signin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  try {
    // ✅ explicitly select password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // ✅ ensure both are defined before compare
    if (!password || !user.password) {
      return res.status(400).json({ success: false, message: "Password is missing." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    // Check if user is approved
    if (user.status === 'pending') {
      return res.status(403).json({ 
        success: false, 
        message: "Your account is pending approval. Please wait for admin approval before logging in.",
        status: 'pending_approval'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({ 
        success: false, 
        message: "Your account has been rejected. Please contact support for more information.",
        status: 'account_rejected'
      });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ 
        success: false, 
        message: "Your account is not approved. Please contact support.",
        status: 'account_not_approved'
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN}
    );
       // ✅ Log successful login activity
    await logActivity({
      usr_id: user._id,
      type: 'user_logged_in',
      description: `User logged in: ${user.name} (${user.email})`
    });

    res.json({
      success: true,
      message: "Logged in successfully.",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Signin error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error during signin." });
  }
};


// ✅ Get Profile
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('GetMe error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error while fetching profile.' });
  }
};

 