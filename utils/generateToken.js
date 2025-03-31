const jwt = require("jsonwebtoken")
const { NODE_ENV, SECRET_KEY } = require("../config/envVars")

const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1d" })
    res.cookie("jwt-bingbong-token", token, {
        httpOnly: true,
        secure: NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax", // Use "none" for localhost development
        maxAge: 864000000
    })
    return token
}

module.exports = generateToken