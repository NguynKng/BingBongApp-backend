const QuizScore = require("../../models/quiz/quizScoreModel");
const UserScore = require("../../models/quiz/userScoreModel");

// Ghi nhận điểm của người dùng cho một quiz
const updateQuizScore = async (req, res) => {
  try {
    const { quizId, score } = req.body;
    const userId = req.user._id;

    if (!quizId || typeof score !== "number" || score < 0) {
      return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    let quizScore = await QuizScore.findOne({ user: userId, quiz: quizId });
    let scoreDiff = 0;

    if (!quizScore) {
      // Nếu chưa có thì tạo mới
      quizScore = new QuizScore({ user: userId, quiz: quizId, score });
      scoreDiff = score;
    } else {
      // Nếu đã có thì cập nhật điểm mới nhất
      scoreDiff = score - quizScore.score;
      quizScore.score = score;
    }

    await quizScore.save();

    // Cập nhật tổng điểm người dùng
    let userScore = await UserScore.findOne({ user: userId });
    if (!userScore) {
      userScore = new UserScore({ user: userId, totalScore: score });
    } else {
      userScore.totalScore += scoreDiff;
      if (userScore.totalScore < 0) userScore.totalScore = 0;
    }
    await userScore.save();

    // Cập nhật bảng xếp hạng quiz
    const allScores = await QuizScore.find({ quiz: quizId }).sort({ score: -1 });
    for (let i = 0; i < allScores.length; i++) {
      allScores[i].rank = i + 1;
      await allScores[i].save();
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật điểm thành công",
      quizScore,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật điểm",
      error: err.message,
    });
  }
};

// Lấy điểm của người dùng cho 1 quiz
const getQuizScore = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user._id;

    const quizScore = await QuizScore.findOne({ user: userId, quiz: quizId });
    if (!quizScore) {
      return res.status(404).json({
        success: false,
        message: "Bạn chưa chơi quiz này",
      });
    }

    res.json({
      success: true,
      score: quizScore.score,
      rank: quizScore.rank,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy điểm",
    });
  }
};

// Lấy bảng xếp hạng quiz
const getQuizLeaderboard = async (req, res) => {
  try {
    const { quizId } = req.params;

    const leaderboard = await QuizScore.find({ quiz: quizId })
      .populate("user", "name avatar")
      .sort({ score: -1 });

    res.json({
      success: true,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy bảng xếp hạng",
    });
  }
};

module.exports = {
  updateQuizScore,
  getQuizScore,
  getQuizLeaderboard,
};