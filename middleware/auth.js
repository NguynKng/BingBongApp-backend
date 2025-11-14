const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config/envVars");
const userModel = require("../models/userModel");

/**
 * 🔒 Middleware bảo vệ route — yêu cầu có token hợp lệ
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Ưu tiên lấy từ header Authorization: Bearer <token>
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Nếu không có token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Không có token, vui lòng đăng nhập lại",
      });
    }

    // ✅ Xác thực token
    const decoded = jwt.verify(token, SECRET_KEY);

    // ✅ Tìm user tương ứng
    const user = await userModel.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không tồn tại hoặc đã bị xóa",
      });
    }

    // Gắn thông tin user vào request để route sau dùng được
    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ success: false, message: "Token không hợp lệ" });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại",
      });
    }

    console.error("❌ Lỗi middleware xác thực:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi xác thực hệ thống" });
  }
};

/**
 * 🛡️ Middleware kiểm tra quyền admin
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res
      .status(401)
      .json({ success: false, message: "Chưa xác thực người dùng" });
  }

  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Bạn không có quyền truy cập" });
  }

  next();
};

module.exports = { protect, isAdmin };
