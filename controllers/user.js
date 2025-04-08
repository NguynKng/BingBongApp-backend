const userModel = require("../models/userModel");
const fs = require('fs');
const path = require('path');

// Helper function to ensure directory exists
const ensureDirectoryExists = (directory) => {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
};

// Set avatar for user
const setAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const userId = req.user._id;
        const fileName = req.file.filename;
        const avatarPath = `/uploads/user/${userId}/avatar/${fileName}`;

        // Update user avatar in database
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { avatar: avatarPath },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Avatar updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Set avatar error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// Set cover photo for user
const setCoverPhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const userId = req.user._id;
        const fileName = req.file.filename;
        const coverPhotoPath = `/uploads/user/${userId}/cover_photo/${fileName}`;

        // Update user cover photo in database
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { coverPhoto: coverPhotoPath },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Cover photo updated successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Set cover photo error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

// Get user profile
const getUserProfile = async (req, res) => {
    try {
        // If userId is provided in params, use it, otherwise use the authenticated user's ID
        const userId = req.params.userId || req.user._id;
        
        const user = await userModel.findById(userId).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        
        return res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error("Get user profile error:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};

module.exports = { setAvatar, setCoverPhoto, getUserProfile };
