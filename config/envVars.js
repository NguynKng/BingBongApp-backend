const dotenv = require("dotenv")
dotenv.config()

module.exports = {
    PORT: process.env.PORT || 8000,
    MONGO_URI: process.env.MONGO_URI,
    SECRET_KEY: process.env.SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_AI_PYTHON_URL: process.env.BACKEND_AI_PYTHON_URL,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    PERSPECTIVE_API_KEY: process.env.PERSPECTIVE_API_KEY
}