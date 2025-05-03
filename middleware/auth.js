const jwt = require('jsonwebtoken');
const { SECRET_KEY } = require('../config/envVars');
const userModel = require('../models/userModel');

// Middleware to protect routes
const protect = async (req, res, next) => {
    try {
        const token = req.cookies['jwt-bingbong-token'];
        console.log("📌 Token từ cookie:", token);
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authorized, no token' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, SECRET_KEY);
        console.log("📌 Thông tin sau khi decode JWT:", decoded);
        // Find user by id
        const user = await userModel.findById(decoded.userId).select('-password');

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Set user in request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token',
            });
        } 
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired',
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Not authorized' 
        });
    }
};

// Optional auth middleware - doesn't require auth but will set user if token exists
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies['jwt-bingbong-token'];

        if (!token) {
            return next();
        }

        // Verify token
        const decoded = jwt.verify(token, SECRET_KEY);

        // Find user by id
        const user = await userModel.findById(decoded.userId).select('-password');

        if (user) {
            req.user = user;
        }
        
        next();
    } catch (error) {
        // Just continue without auth if token is invalid
        next();
    }
};


module.exports = { protect, optionalAuth };
