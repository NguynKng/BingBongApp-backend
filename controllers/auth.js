const userModel = require("../models/userModel");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");

const signup = async (req, res) => {
    try {
        const { email, fullName, password, phoneNumber, dateOfBirth, gender } = req.body;

        // Validate required fields
        if (!email || !fullName || !password || !phoneNumber || !dateOfBirth || !gender)
            return res.status(400).json({ success: false, message: "All fields are required." });

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res.status(400).json({ success: false, message: "Invalid email format." });

        // Check if email already exists
        const existingEmail = await userModel.findOne({ email });
        if (existingEmail)
            return res.status(400).json({ success: false, message: "Email already exists." });

        // Validate password length
        if (password.length < 6)
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new userModel({
            email,
            fullName,
            password: hashedPassword,
            phoneNumber,
            dateOfBirth,
            gender
        });

        await newUser.save();

        return res.status(201).json({ success: true, message: "Account created successfully." });

    } catch (err) {
        console.error("Signup error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password)
            return res.status(400).json({ success: false, message: "All fields are required." });

        // Find user by email
        const user = await userModel.findOne({ email });

        if (!user)
            return res.status(404).json({ success: false, message: "Invalid email or password." });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: "Invalid email or password." });

        // Generate and set token
        const token = generateToken(user._id, res);

        // Return user data
        return res.status(200).json({
            success: true,
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                gender: user.gender,
                dateOfBirth: user.dateOfBirth,
                avatar: user.avatar,
                coverPhoto: user.coverPhoto,
                friends: user.friends,
                friendRequests: user.friendRequests,
                privacy: user.privacy
            }
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ success: false, message: "Something went wrong." });
    }
};

const logout = async (req, res) => {
    try {
        // Clear auth cookie
        res.clearCookie("jwt-bingbong-token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        });
        return res.status(200).json({ success: true, message: "Logged out successfully." });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const authCheck = (req, res) => {
    try {
        // req.user is set by the auth middleware
        return res.status(200).json({ 
            success: true, 
            user: {
                _id: req.user._id,
                fullName: req.user.fullName,
                email: req.user.email,
                phoneNumber: req.user.phoneNumber,
                gender: req.user.gender,
                dateOfBirth: req.user.dateOfBirth,
                avatar: req.user.avatar,
                coverPhoto: req.user.coverPhoto,
                friends: req.user.friends,
                friendRequests: req.user.friendRequests,
                privacy: req.user.privacy
            }
        });
    } catch (error) {
        console.error("Auth check error:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

module.exports = { signup, loginUser, logout, authCheck };