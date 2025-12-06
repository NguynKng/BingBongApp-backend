const userModel = require("../models/userModel");
const ResetToken = require("../models/resetToken");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utils/generateToken");
const sendVerificationEmail = require("../utils/sendEmail");

const signup = async (req, res) => {
  try {
    const { email, fullName, password, phoneNumber, dateOfBirth, gender } =
      req.body;

    // Validate required fields
    if (
      !email ||
      !fullName ||
      !password ||
      !phoneNumber ||
      !dateOfBirth ||
      !gender
    )
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res
        .status(400)
        .json({ success: false, message: "Invalid email format." });

    // Check if email already exists
    const existingEmail = await userModel.findOne({ email });
    if (existingEmail)
      return res
        .status(400)
        .json({ success: false, message: "Email already exists." });

    // Validate password length
    if (password.length < 6)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long.",
      });

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
      gender,
    });

    await newUser.save();
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await ResetToken.findOneAndDelete({ userId: newUser._id }); // Xoá mã cũ nếu có
    await ResetToken.create({
      userId: newUser._id,
      code,
      type: "verifyAccount",
    }); // Tạo mã mới

    await sendVerificationEmail(email, code, fullName, "verifyAccount");

    return res
      .status(201)
      .json({ success: true, message: "Account created successfully." });
  } catch (err) {
    console.error("Signup error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });

    // Find user by email
    const user = await userModel.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or password." });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });

    // Generate and set token
    const token = generateToken(res, user._id);

    // Return user data
    return res.status(200).json({
      success: true,
      token,
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
        role: user.role,
        friendRequests: user.friendRequests,
        privacy: user.privacy,
        slug: user.slug,
        ringtones: user.ringtones,
        activeRingtone: user.activeRingtone,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong." });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Check if user is admin
    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password." });
    }

    // Generate and set token
    const token = generateToken(res, user._id);

    // Return user data
    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        avatar: user.avatar,
        role: user.role,
        coverPhoto: user.coverPhoto,
        friends: user.friends,
        friendRequests: user.friendRequests,
        privacy: user.privacy,
        slug: user.slug,
        ringtones: user.ringtones,
        activeRingtone: user.activeRingtone,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Server error" });
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
        role: req.user.role,
        coverPhoto: req.user.coverPhoto,
        friends: req.user.friends,
        friendRequests: req.user.friendRequests,
        privacy: req.user.privacy,
        slug: req.user.slug,
        ringtones: req.user.ringtones,
        activeRingtone: req.user.activeRingtone,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Email not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await ResetToken.findOneAndDelete({ userId: user._id }); // Xóa token cũ nếu có
    await ResetToken.create({ userId: user._id, code, type: "resetPassword" }); // Tạo token mới

    const username = user.fullName;

    await sendVerificationEmail(email, code, username, "resetPassword");

    res
      .status(200)
      .json({ success: true, message: "Reset code sent to email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const verifyCode = async (req, res) => {
  try {
    const { email, code, action } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const resetToken = await ResetToken.findOne({
      userId: user._id,
      code,
      type: action,
    });

    if (!resetToken || resetToken.expiresAt < Date.now()) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired code" });
    }

    // Xác thực tài khoản
    if (action === "verifyAccount") {
      user.isVerified = true;
      await user.save();
      await ResetToken.deleteOne({ _id: resetToken._id });
    }

    return res.status(200).json({
      success: true,
      message: "Code verified successfully",
    });
  } catch (err) {
    console.error("Verify code error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const user = await userModel.findOne({ email });

    // Check token existence
    const token = await ResetToken.findOne({ userId: user._id });

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token expired or not found",
      });
    }
    const salt = await bcrypt.genSalt(10);
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await userModel.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );

    // Clean up token
    await ResetToken.deleteOne({ userId: user._id });

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  signup,
  loginUser,
  loginAdmin,
  authCheck,
  forgotPassword,
  verifyCode,
  resetPassword,
};
