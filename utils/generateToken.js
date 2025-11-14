const jwt = require("jsonwebtoken");
const { SECRET_KEY, NODE_ENV } = require("../config/envVars");

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1d" });
//   res.cookie("token", token, {
//     httpOnly: true, // không thể truy cập từ JS (bảo mật XSS)
//     secure: false, // chỉ gửi qua HTTPS
//     sameSite: "lax",
//     maxAge: 24 * 60 * 60 * 1000, // 1 ngày
//   });
  return token;
};

module.exports = { generateToken };
