const Score = require("../models/rankModel"); // Import Score model

// Lấy bảng xếp hạng tổng điểm người dùng
const getLeaderboard = async (req, res) => {
  try {
    const scores = await Score.find()
      .populate("user", "name avatar") // Lấy thông tin user: name và avatar
      .sort({ totalScore: -1 });

    res.json({ success: true, leaderboard: scores });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Lấy tổng điểm của người dùng hiện tại
const getMyScore = async (req, res) => {
  try {
    const score = await Score.findOne({ user: req.user._id });

    res.json({
      success: true,
      totalScore: score ? score.totalScore : 0,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Cập nhật hoặc cộng thêm điểm cho người dùng hiện tại
const addScore = async (req, res) => {
  try {
    const { scoreEarned } = req.body;

    if (typeof scoreEarned !== "number" || scoreEarned < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Điểm không hợp lệ" });
    }

    const updatedScore = await Score.findOneAndUpdate(
      { user: req.user._id },
      {
        $inc: { totalScore: scoreEarned },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, score: updatedScore });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const addOrUpdateScore = async (req, res) => {
  const { userId, quizId, score } = req.body;

  try {
    // Kiểm tra xem người chơi đã có điểm cho quiz này chưa
    let rank = await Rank.findOne({ user: userId, quiz: quizId });

    if (rank) {
      // Nếu đã có điểm, cập nhật điểm
      rank.score = score;
    } else {
      // Nếu chưa có điểm, tạo mới
      rank = new Rank({
        user: userId,
        quiz: quizId,
        score: score,
      });
    }

    // Lưu hoặc cập nhật điểm
    await rank.save();

    // Tính lại xếp hạng cho tất cả người chơi trong quiz này
    const allRanks = await Rank.find({ quiz: quizId }).sort({ score: -1 });
    allRanks.forEach((rank, index) => {
      rank.rank = index + 1;
      rank.save(); // Cập nhật lại rank cho tất cả các người chơi
    });

    res.status(200).json({ success: true, message: "Điểm đã được lưu thành công!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
  }
};
module.exports = {
  getLeaderboard,
  getMyScore,
  addScore,
  addOrUpdateScore,
};