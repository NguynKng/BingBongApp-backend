const mongoose = require('mongoose');

const quizScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
  }
}, { timestamps: true });

quizScoreSchema.index({ user: 1, quiz: 1 }, { unique: true }); 

module.exports = mongoose.model('QuizScore', quizScoreSchema);