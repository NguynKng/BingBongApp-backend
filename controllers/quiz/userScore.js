const UserScore = require("../../models/quiz/userScoreModel"); // Import model lưu điểm người dùng
const QuizScore = require("../../models/quiz/quizScoreModel"); // Import model lưu điểm quiz

// Lấy tổng điểm của người dùng hiện tại
const getMyTotalScore = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy id người dùng từ token

    const userScore = await UserScore.findOne({ user: userId });
    if (!userScore) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy điểm của người dùng",
      });
    }

    res.json({
      success: true,
      totalScore: userScore.totalScore,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy thông tin điểm người dùng",
    });
  }
};

// Cập nhật hoặc cộng điểm cho người dùng khi chơi quiz
const updateUserTotalScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const { scoreEarned } = req.body;

    if (typeof scoreEarned !== "number" || scoreEarned < 0) {
      return res
        .status(400)
        .json({ success: false, message: "Điểm không hợp lệ" });
    }

    let userScore = await UserScore.findOne({ user: userId });
    if (!userScore) {
      // Nếu người dùng chưa có điểm, tạo mới
      userScore = new UserScore({
        user: userId,
        totalScore: scoreEarned,
      });
    } else {
      // Nếu đã có, cộng thêm điểm
      userScore.totalScore += scoreEarned;
    }

    await userScore.save();
    res.status(200).json({ success: true, score: userScore });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật điểm người dùng",
    });
  }
};

// Lấy bảng xếp hạng người dùng (dựa trên tổng điểm)
const getUserLeaderboard = async (req, res) => {
  try {
    const leaderboard = await UserScore.find()
      .populate("user", "fullName avatar") // Lấy tên và avatar người dùng
      .sort({ totalScore: -1 }); // Sắp xếp theo điểm giảm dần

    res.json({
      success: true,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy bảng xếp hạng người dùng",
    });
  }
};

module.exports = {
  getMyTotalScore,
  updateUserTotalScore,
  getUserLeaderboard,
};