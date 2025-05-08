const mongoose = require('mongoose');

const userScoreSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // mỗi user chỉ có một bản ghi tổng điểm
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    quizPlayedCount: {
      type: Number,
      default: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true, // tự động tạo createdAt và updatedAt
  }
);

// Cập nhật ngày mỗi khi save
userScoreSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

const UserScore = mongoose.model('UserScore', userScoreSchema);

module.exports = UserScore;