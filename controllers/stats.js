const userModel = require("../models/userModel");
const postModel = require("../models/postModel");
const commentModel = require("../models/commentModel");
const reactionModel = require("../models/reactionModel");
const groupModel = require("../models/groupModel");
const shopModel = require("../models/shopModel");
const productModel = require("../models/productModel");
const badgeModel = require("../models/badgeModel");

// ✅ 1. Thống kê tổng quan - LAST MONTH FOCUSED
const getStats = async (req, res) => {
  try {
    // === TOTAL COUNTS ===
    const userCount = await userModel.countDocuments();
    const postCount = await postModel.countDocuments();
    const commentCount = await commentModel.countDocuments();
    const groupCount = await groupModel.countDocuments();
    const likeCount = await reactionModel.countDocuments();
    const shopCount = await shopModel.countDocuments();
    const productCount = await productModel.countDocuments();
    const badgeCount = await badgeModel.countDocuments();

    // === LAST MONTH DATA ===
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthUsers = await userModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthPosts = await postModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthComments = await commentModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthGroups = await groupModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthShops = await shopModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthProducts = await productModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthBadges = await badgeModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });

    // === THIS MONTH DATA (for comparison) ===
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const thisMonthUsers = await userModel.countDocuments({
      createdAt: { $gte: thisMonthStart },
    });
    const thisMonthPosts = await postModel.countDocuments({
      createdAt: { $gte: thisMonthStart },
    });
    const thisMonthComments = await commentModel.countDocuments({
      createdAt: { $gte: thisMonthStart },
    });
    const thisMonthBadges = await badgeModel.countDocuments({
      createdAt: { $gte: thisMonthStart },
    });

    // === GROWTH PERCENTAGES ===
    const userGrowth = lastMonthUsers > 0 
      ? (((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1)
      : thisMonthUsers > 0 ? 100 : 0;

    const postGrowth = lastMonthPosts > 0
      ? (((thisMonthPosts - lastMonthPosts) / lastMonthPosts) * 100).toFixed(1)
      : thisMonthPosts > 0 ? 100 : 0;

    const commentGrowth = lastMonthComments > 0
      ? (((thisMonthComments - lastMonthComments) / lastMonthComments) * 100).toFixed(1)
      : thisMonthComments > 0 ? 100 : 0;

    const badgeGrowth = lastMonthBadges > 0
      ? (((thisMonthBadges - lastMonthBadges) / lastMonthBadges) * 100).toFixed(1)
      : thisMonthBadges > 0 ? 100 : 0;

    // === ACTIVE USERS (Last 7 days) ===
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeUserIds = await postModel.distinct("author", {
      createdAt: { $gte: sevenDaysAgo },
    });
    const activeCommentUserIds = await commentModel.distinct("author", {
      createdAt: { $gte: sevenDaysAgo },
    });
    const activeUsersCount = new Set([
      ...activeUserIds,
      ...activeCommentUserIds,
    ]).size;

    // === ENGAGEMENT METRICS ===
    const avgCommentsPerPost = postCount > 0 ? (commentCount / postCount).toFixed(2) : 0;
    const avgLikesPerPost = postCount > 0 ? (likeCount / postCount).toFixed(2) : 0;
    const avgGroupMembers = groupCount > 0 
      ? (await groupModel.aggregate([
          { $project: { memberCount: { $size: "$members" } } },
          { $group: { _id: null, avg: { $avg: "$memberCount" } } }
        ]))[0]?.avg.toFixed(0) || 0
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        // ✅ Overview - Grouped by category
        overview: {
          // Community (Users + Groups + Shops)
          community: {
            userCount,
            groupCount,
            shopCount,
          },
          
          // Content (Posts + Comments + Reactions)
          content: {
            postCount,
            commentCount,
            likeCount,
          },
          
          // Others (Products + Badges)
          others: {
            productCount,
            badgeCount,
          },
        },

        // Last month data
        lastMonth: {
          users: lastMonthUsers,
          posts: lastMonthPosts,
          comments: lastMonthComments,
          groups: lastMonthGroups,
          shops: lastMonthShops,
          products: lastMonthProducts,
          badges: lastMonthBadges,
          monthName: lastMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        },

        // This month data
        thisMonth: {
          users: thisMonthUsers,
          posts: thisMonthPosts,
          comments: thisMonthComments,
          badges: thisMonthBadges,
          monthName: thisMonthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        },

        // Growth comparison
        growth: {
          users: {
            value: parseFloat(userGrowth),
            trend: userGrowth >= 0 ? "up" : "down",
            lastMonth: lastMonthUsers,
            thisMonth: thisMonthUsers,
          },
          posts: {
            value: parseFloat(postGrowth),
            trend: postGrowth >= 0 ? "up" : "down",
            lastMonth: lastMonthPosts,
            thisMonth: thisMonthPosts,
          },
          comments: {
            value: parseFloat(commentGrowth),
            trend: commentGrowth >= 0 ? "up" : "down",
            lastMonth: lastMonthComments,
            thisMonth: thisMonthComments,
          },
          badges: {
            value: parseFloat(badgeGrowth),
            trend: badgeGrowth >= 0 ? "up" : "down",
            lastMonth: lastMonthBadges,
            thisMonth: thisMonthBadges,
          },
        },

        // Engagement metrics
        engagement: {
          activeUsersCount,
          avgCommentsPerPost,
          avgLikesPerPost,
          avgGroupMembers,
          engagementRate: userCount > 0 ? ((activeUsersCount / userCount) * 100).toFixed(1) : 0,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 2. Thống kê giới tính người dùng
const getUserGenderStats = async (req, res) => {
  try {
    const maleCount = await userModel.countDocuments({ gender: "Male" });
    const femaleCount = await userModel.countDocuments({ gender: "Female" });
    const otherCount = await userModel.countDocuments({ gender: "Other" });
    const total = maleCount + femaleCount + otherCount;

    // Last month gender stats
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthMale = await userModel.countDocuments({
      gender: "Male",
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthFemale = await userModel.countDocuments({
      gender: "Female",
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthOther = await userModel.countDocuments({
      gender: "Other",
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });

    return res.status(200).json({
      success: true,
      data: {
        total: {
          maleCount,
          femaleCount,
          otherCount,
          total,
          percentages: {
            male: total > 0 ? ((maleCount / total) * 100).toFixed(1) : 0,
            female: total > 0 ? ((femaleCount / total) * 100).toFixed(1) : 0,
            other: total > 0 ? ((otherCount / total) * 100).toFixed(1) : 0,
          },
        },
        lastMonth: {
          male: lastMonthMale,
          female: lastMonthFemale,
          other: lastMonthOther,
          total: lastMonthMale + lastMonthFemale + lastMonthOther,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 3. Thống kê Users, Groups, Shops theo tháng (COMMUNITY)
const getUserGroupShopStats = async (req, res) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const userAgg = await userModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const groupAgg = await groupModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const shopAgg = await shopModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const userCountByMonth = {};
    userAgg.forEach((x) => (userCountByMonth[x._id] = x.count));

    const groupCountByMonth = {};
    groupAgg.forEach((x) => (groupCountByMonth[x._id] = x.count));

    const shopCountByMonth = {};
    shopAgg.forEach((x) => (shopCountByMonth[x._id] = x.count));

    const chartData = months.flatMap((monthName, idx) => {
      const m = idx + 1;
      return [
        { type: monthName, value: userCountByMonth[m] || 0, group: "Users" },
        { type: monthName, value: groupCountByMonth[m] || 0, group: "Groups" },
        { type: monthName, value: shopCountByMonth[m] || 0, group: "Shops" },
      ];
    });

    return res.status(200).json({ success: true, year, data: chartData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 4. Thống kê Posts, Comments, Reactions theo tháng (CONTENT)
const getPostCommentReactionStats = async (req, res) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  try {
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const start = new Date(`${year}-01-01T00:00:00.000Z`);
    const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);

    const postAgg = await postModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const commentAgg = await commentModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const reactionAgg = await reactionModel.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end } } },
      { $group: { _id: { $month: "$createdAt" }, count: { $sum: 1 } } },
    ]);

    const postCountByMonth = {};
    postAgg.forEach((x) => (postCountByMonth[x._id] = x.count));

    const commentCountByMonth = {};
    commentAgg.forEach((x) => (commentCountByMonth[x._id] = x.count));

    const reactionCountByMonth = {};
    reactionAgg.forEach((x) => (reactionCountByMonth[x._id] = x.count));

    const chartData = months.flatMap((monthName, idx) => {
      const m = idx + 1;
      return [
        { type: monthName, value: postCountByMonth[m] || 0, group: "Posts" },
        { type: monthName, value: commentCountByMonth[m] || 0, group: "Comments" },
        { type: monthName, value: reactionCountByMonth[m] || 0, group: "Reactions" },
      ];
    });

    return res.status(200).json({ success: true, year, data: chartData });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 5. Top 10 Users có nhiều bài viết nhất
const getTopUsers = async (req, res) => {
  try {
    const topUsers = await postModel.aggregate([
      { $group: { _id: "$author", postCount: { $sum: 1 } } },
      { $sort: { postCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      {
        $project: {
          _id: 1,
          postCount: 1,
          fullName: "$userInfo.fullName",
          email: "$userInfo.email",
          avatar: "$userInfo.avatar",
        },
      },
    ]);

    return res.status(200).json({ success: true, data: topUsers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 6. Top 10 Posts có nhiều reactions nhất
const getTopPosts = async (req, res) => {
  try {
    const topPosts = await reactionModel.aggregate([
      { $group: { _id: "$target", reactionCount: { $sum: 1 } } },
      { $sort: { reactionCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "_id",
          as: "postInfo",
        },
      },
      { $unwind: "$postInfo" },
      {
        $lookup: {
          from: "users",
          localField: "postInfo.author",
          foreignField: "_id",
          as: "authorInfo",
        },
      },
      { $unwind: "$authorInfo" },
      {
        $project: {
          _id: 1,
          reactionCount: 1,
          content: "$postInfo.content",
          createdAt: "$postInfo.createdAt",
          author: {
            fullName: "$authorInfo.fullName",
            avatar: "$authorInfo.avatar",
          },
        },
      },
    ]);

    return res.status(200).json({ success: true, data: topPosts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 7. Thống kê hoạt động 7 ngày gần đây
const getRecentActivity = async (req, res) => {
  try {
    const days = [];
    const activities = {
      users: [],
      posts: [],
      comments: [],
      likes: [],
    };

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      days.push(dayName);

      activities.users.push(
        await userModel.countDocuments({ createdAt: { $gte: date, $lt: nextDate } })
      );
      activities.posts.push(
        await postModel.countDocuments({ createdAt: { $gte: date, $lt: nextDate } })
      );
      activities.comments.push(
        await commentModel.countDocuments({ createdAt: { $gte: date, $lt: nextDate } })
      );
      activities.likes.push(
        await reactionModel.countDocuments({ createdAt: { $gte: date, $lt: nextDate } })
      );
    }

    return res.status(200).json({
      success: true,
      data: { days, ...activities },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 8. Thống kê Groups
const getGroupStats = async (req, res) => {
  try {
    const totalGroups = await groupModel.countDocuments();

    const topGroups = await groupModel.aggregate([
      { $project: { name: 1, avatar: 1, memberCount: { $size: "$members" }, createdAt: 1 } },
      { $sort: { memberCount: -1 } },
      { $limit: 5 },
    ]);

    // Last month groups
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthGroups = await groupModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalGroups,
        lastMonthGroups,
        topGroups,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ 9. Thống kê Shop & Products
const getShopStats = async (req, res) => {
  try {
    const totalShops = await shopModel.countDocuments();
    const totalProducts = await productModel.countDocuments();

    const topShops = await productModel.aggregate([
      { $group: { _id: "$shop", productCount: { $sum: 1 } } },
      { $sort: { productCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "shops",
          localField: "_id",
          foreignField: "_id",
          as: "shopInfo",
        },
      },
      { $unwind: "$shopInfo" },
      {
        $project: {
          _id: 1,
          productCount: 1,
          shopName: "$shopInfo.name",
          shopOwner: "$shopInfo.owner",
          shopAvatar: "$shopInfo.avatar",
        },
      },
    ]);

    // Last month data
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);

    const lastMonthShops = await shopModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });
    const lastMonthProducts = await productModel.countDocuments({
      createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalShops,
        totalProducts,
        avgProductsPerShop: totalShops > 0 ? (totalProducts / totalShops).toFixed(2) : 0,
        lastMonth: {
          shops: lastMonthShops,
          products: lastMonthProducts,
        },
        topShops,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getStats,
  getUserGenderStats,
  getUserGroupShopStats,
  getPostCommentReactionStats,
  getTopUsers,
  getTopPosts,
  getRecentActivity,
  getGroupStats,
  getShopStats,
};