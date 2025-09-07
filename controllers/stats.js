const userModel = require("../models/userModel");
const postModel = require("../models/postModel");
const commentModel = require("../models/commentModel");
const reactionModel = require("../models/reactionModel");

const getStats = async (req, res) => {
  try {
    const userCount = await userModel.countDocuments();
    const postCount = await postModel.countDocuments();
    const commentCount = await commentModel.countDocuments();
    const likeCount = await reactionModel.countDocuments({ type: "Like" });
    return res.status(200).json({
      success: true,
      data: { userCount, postCount, commentCount, likeCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUserGenderStats = async (req, res) => {
  try {
    const maleCount = await userModel.countDocuments({ gender: "Male" });
    const femaleCount = await userModel.countDocuments({ gender: "Female" });
    const otherCount = await userModel.countDocuments({ gender: "Other" });
    return res.status(200).json({
      success: true,
      data: { maleCount, femaleCount, otherCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getUserAndPostsStats = async (req, res) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  try {
    // optional: ?year=2025
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();

    // start / end of year
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    // aggregate users by month
    const userAgg = await userModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { $month: "$createdAt" }, // 1..12
          count: { $sum: 1 },
        },
      },
    ]);

    // aggregate posts by month
    const postAgg = await postModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    // convert to maps for easy lookup
    const userCountByMonth = {};
    userAgg.forEach((x) => {
      userCountByMonth[x._id] = x.count;
    });

    const postCountByMonth = {};
    postAgg.forEach((x) => {
      postCountByMonth[x._id] = x.count;
    });

    // build result in the format expected by your Column chart:
    // [ { type: "January", value: 120, group: "Users" }, { type: "January", value: 80, group: "Posts" }, ... ]
    const columnChartData = months.flatMap((monthName, idx) => {
      const m = idx + 1; // month number 1..12
      const users = userCountByMonth[m] || 0;
      const posts = postCountByMonth[m] || 0;

      return [
        { type: monthName, value: users, group: "Users" },
        { type: monthName, value: posts, group: "Posts" },
      ];
    });

    return res.status(200).json({ success: true, year, data: columnChartData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getStats, getUserGenderStats, getUserAndPostsStats };
