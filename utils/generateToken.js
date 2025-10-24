const jwt = require("jsonwebtoken")
const { SECRET_KEY } = require("../config/envVars")

const generateToken = (userId) => {
    const token = jwt.sign({ userId }, SECRET_KEY, { expiresIn: "1d" })
    return token
}

module.exports = { generateToken }