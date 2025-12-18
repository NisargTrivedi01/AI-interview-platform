import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret-key';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Signup Controller
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('📝 Signup request:', { name, email, password: password ? '***' : 'missing' });

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Create new user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password
    });

    // Save user (password will be hashed by pre-save hook)
    await user.save();

    // Generate token
    const token = generateToken(user._id);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during signup',
      error: error.message
    });
  }
};

// Login Controller - FIXED VERSION
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login request:', { email, password: password ? '***' : 'missing' });

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user by email - explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log('✅ User found:', user.email);
    console.log('🔍 Password check - User has password:', !!user.password);

    // Check if user has a password (in case of social login users)
    if (!user.password) {
      console.log('❌ No password set for user');
      return res.status(400).json({
        success: false,
        message: 'No password set for this account. Please use signup.'
      });
    }

    // Compare passwords - FIXED: Add proper error handling
    let isPasswordValid = false;
    try {
      console.log('🔐 Comparing passwords...');
      isPasswordValid = await user.comparePassword(password);
      console.log('✅ Password comparison result:', isPasswordValid);
    } catch (compareError) {
      console.error('❌ Password comparison failed:', compareError);
      return res.status(400).json({
        success: false,
        message: 'Password comparison failed. Please try again.'
      });
    }

    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// Verify Token Controller
export const verifyToken = async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Get User Profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        interviewCount: user.interviewHistory?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Health Check
export const healthCheck = (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is running',
    timestamp: new Date().toISOString()
  });
};