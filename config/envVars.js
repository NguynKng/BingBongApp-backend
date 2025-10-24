const dotenv = require("dotenv")
dotenv.config()

module.exports = {
    PORT: process.env.PORT || 8000,
    MONGO_URI: process.env.MONGO_URI,
    SECRET_KEY: process.env.SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
    FRONTEND_URL: process.env.FRONTEND_URL,
    EXPO_URL: process.env.EXPO_URL,
    TURN_HOST: process.env.TURN_HOST,
    TURN_PORT: process.env.TURN_PORT || 3478,
    TURN_SECRET: process.env.TURN_SECRET,
    BACKEND_AI_PYTHON_URL: process.env.BACKEND_AI_PYTHON_URL,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    PERSPECTIVE_API_KEY: process.env.PERSPECTIVE_API_KEY,
    TMDB_API_KEY: process.env.TMDB_API_KEY
}