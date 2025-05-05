// rankModel.js
const mongoose = require("mongoose");

const rankSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Liên kết với bảng User để lấy thông tin người chơi
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Quiz", // Liên kết với bảng Quiz để biết người chơi đã tham gia quiz nào
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0, // Điểm không thể âm
  },
  rank: {
    type: Number, // Xếp hạng của người chơi
    default: 0, // Giá trị mặc định
  },
  date: {
    type: Date,
    default: Date.now, // Lưu ngày tham gia quiz
  }
}, { timestamps: true });

// Đảm bảo mỗi người dùng có điểm duy nhất cho mỗi quiz
rankSchema.index({ user: 1, quiz: 1 }, { unique: true });

// Tính lại xếp hạng sau khi lưu điểm
rankSchema.pre('save', async function(next) {
  try {
    const rankData = await Rank.find({ quiz: this.quiz }).sort({ score: -1 }).exec();
    this.rank = rankData.findIndex(r => r.user.toString() === this.user.toString()) + 1; // Tính xếp hạng người chơi
    next();
  } catch (error) {
    next(error);
  }
});

const Rank = mongoose.model("Rank", rankSchema);

module.exports = Rank;
