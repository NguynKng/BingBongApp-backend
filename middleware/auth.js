const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/envVars');
const userModel = require('../models/userModel');

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    let token;
    // Ưu tiên Bearer token từ header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có token, vui lòng đăng nhập lại',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await userModel.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ' });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi xác thực' });
  }
};

// Optional auth middleware - doesn't require auth but will set user if token exists
const isAdmin = (req, res, next) => {
  if (req.user.role === "admin") {
    next();
  } else {
    return res
      .status(403)
      .json({ success: false, message: "You are not an admin" });
  }
};

module.exports = { protect, isAdmin };
