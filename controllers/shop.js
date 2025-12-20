const Shop = require("../models/shopModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");
const ShopFollowHistory = require("../models/shopFollowHistoryModel");
const mongoose = require("mongoose");
const { sendNotification } = require("./notification");
const { removeVietnameseTones } = require("../utils/validate");

const followShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user._id;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }
    if (shop.followers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are already following this shop",
      });
    }
    shop.followers.push(userId);
    await shop.save();
    // Chỉ log nếu hành động thực sự thay đổi
    await ShopFollowHistory.create({
      shop: shopId,
      user: userId,
      action: "follow",
    });
    await sendNotification([shop.owner], userId, "new_shop_follower", {
      shopId: shop._id,
      shopSlug: shop.slug,
      shopName: shop.name,
      shopAvatar: shop.avatar,
    });
    return res
      .status(200)
      .json({ success: true, message: "Followed the shop successfully" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const unfollowShop = async (req, res) => {
  try {
    const { shopId } = req.params;
    const userId = req.user._id;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res
        .status(404)
        .json({ success: false, message: "Shop not found" });
    }

    // Nếu user chưa follow
    if (!shop.followers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "You are not following this shop",
      });
    }

    // Xóa userId khỏi danh sách follower
    shop.followers = shop.followers.filter(
      (id) => id.toString() !== userId.toString()
    );

    await shop.save();
    await ShopFollowHistory.create({
      shop: shopId,
      user: userId,
      action: "unfollow",
    });

    return res.status(200).json({
      success: true,
      message: "Unfollowed the shop successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getShopProductRatings = async (req, res) => {
  try {
    const { shopId } = req.params;

    // Lấy tất cả product của shop và populate postedBy trong ratings
    const products = await Product.find({ shop: shopId })
      .select("images name ratings slug")
      .populate({
        path: "ratings.postedBy",
        select: "fullName avatar", // chỉ lấy name & avatar
      });

    // Gộp tất cả ratings vào 1 mảng
    const allRatings = products.flatMap((product) =>
      product.ratings.map((r) => ({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        productImage: product.images[0] || null,
        star: r.star,
        comment: r.comment,
        postedBy: r.postedBy, // object { _id, fullName, avatar }
        createdAt: r.createdAt,
      }))
    );

    // Tính điểm trung bình
    const totalStars = allRatings.reduce((sum, r) => sum + r.star, 0);
    const averageRating =
      allRatings.length > 0 ? totalStars / allRatings.length : 0;

    return res.status(200).json({
      success: true,
      data: allRatings,
      averageRating: Number(averageRating.toFixed(1)), // làm tròn 2 chữ số
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const getShopTopCustomers = async (req, res) => {
  try {
    const { shopId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const shopObjId = mongoose.Types.ObjectId.createFromHexString(shopId);

    const topCustomers = await Order.aggregate([
      { $match: { shop: shopObjId } }, // lọc shop
      {
        $group: {
          _id: "$orderBy", // nhóm theo user
          totalSpent: { $sum: "$total" }, // tổng tiền đã chi
          orderCount: { $sum: 1 }, // tổng số đơn
        },
      },
      { $sort: { totalSpent: -1 } }, // sắp xếp giảm dần theo tiền đã chi
      { $limit: limit },
      {
        $lookup: {
          from: "users", // collection User
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          user: {
            _id: "$user._id",
            fullName: "$user.fullName",
            avatar: "$user.avatar",
          },
          totalSpent: 1,
          orderCount: 1,
        },
      },
    ]);

    return res.status(200).json({ success: true, data: topCustomers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

const createSampleShop = async (req, res) => {
  try {
    const ownerId = "67f51dfb9ce941e9cd77e96a"; // owner mặc định

    // Dữ liệu mẫu (bạn có thể sửa theo ý)
    const shopData = {
      owner: ownerId,
      name: "KHouse",
      slug: "khouse",
      description: {
        about: "Chuyên bán áo thun local brand chất lượng cao.",
        address: "123 Nguyễn Văn Cừ, Quận 5, TP.HCM",
        phone: "0901234567",
        email: "shop.local@example.com",
        website: "https://localbrand.vn",
      },
      categories: [
        {
          name: "Laptop",
        },
        {
          name: "Điện thoại",
        },
      ],
    };

    // Tạo shop mới
    const newShop = new Shop(shopData);
    await newShop.save();

    res.status(201).json({
      message: "Create sample shop successfully",
      shop: newShop,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error", error: error.message, success: false });
  }
};

const createShop = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, categories } = req.body;
    if (!name || !description || !categories || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required information to create a shop.",
      });
    }
    const isExistingName = await Shop.findOne({ name: name.trim() });
    if (isExistingName) {
      return res.status(400).json({
        success: false,
        message: "Shop name already exists, please choose a different name.",
      });
    }
    const shop = new Shop({
      owner: userId,
      name,
      description,
      categories,
      slug: removeVietnameseTones(name)
    });
    await shop.save();
    return res.status(201).json({
      success: true,
      message: "Shop created successfully",
      data: shop,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getShopBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    // Tìm shop theo slug (chỉ lấy 1 shop duy nhất)
    const shop = await Shop.findOne({ slug }).populate(
      "owner",
      "fullName avatar email"
    ); // lấy thông tin chủ shop

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: shop,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate("owner", "fullName avatar email");
    return res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getMyShops = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ token
    const shops = await Shop.find({ owner: userId }).populate(
      "owner",
      "fullName avatar email slug"
    );
    return res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const getFollowedShops = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ token
    const shops = await Shop.find({ followers: userId }).populate(
      "owner",
      "fullName avatar email slug"
    );
    return res.status(200).json({
      success: true,
      data: shops,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const addShopCategory = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ token
    const { shopId } = req.params;
    const { name, isActive } = req.body;

    // Tìm shop thuộc về user
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    // Kiểm tra danh mục đã tồn tại chưa (theo tên, không phân biệt hoa thường)
    const isExist = shop.categories.some(
      (c) => c.name.toLowerCase().trim() === category.name.toLowerCase().trim()
    );

    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "This category already exists in the shop.",
      });
    }

    // Thêm danh mục mới vào shop
    shop.categories.push({ name, isActive });
    await shop.save();

    return res.status(201).json({
      success: true,
      message: "Category added successfully.",
      data: shop.categories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

const updateShopCategory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shopId } = req.params;
    const { name, isActive, _id } = req.body;

    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found.",
      });
    }

    // 🔍 Kiểm tra xem tên danh mục mới đã tồn tại (trừ chính danh mục đang cập nhật)
    const duplicateCategory = shop.categories.find(
      (cat) =>
        cat.name.toLowerCase().trim() === name.toLowerCase().trim() &&
        cat._id.toString() !== _id
    );

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        message: "This category already exists in the shop.",
      });
    }

    // 🔍 Tìm index danh mục cần update
    const categoryIndex = shop.categories.findIndex(
      (cat) => cat._id.toString() === _id
    );

    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Category not found.",
      });
    }

    // 🛠 Cập nhật danh mục trong sản phẩm liên quan
    await Product.updateMany(
      { shop: shopId, category: shop.categories[categoryIndex].name },
      { category: name }
    );

    // ✅ Ghi đè dữ liệu danh mục
    shop.categories[categoryIndex] = {
      _id,
      name,
      isActive,
    };
    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully.",
      data: shop.categories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: error.message,
    });
  }
};

const updateShopInfo = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shopId } = req.params;
    const {
      name,
      description,
      socials,
      openTime,
      closeTime,
      mainCategory,
      status,
      mapURL,
    } = req.body;

    // 🔍 Tìm shop thuộc về user
    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found or you do not have permission to edit it.",
      });
    }

    if (name) {
      shop.name = name;
    }

    // 🔧 Cập nhật thông tin
    if (description) {
      shop.description = {
        ...shop.description,
        about: description.about || shop.description.about,
        address: description.address || shop.description.address,
        phone: description.phone || shop.description.phone,
        email: description.email || shop.description.email,
        website: description.website || shop.description.website,
      };
    }

    if (socials) {
      shop.socials = {
        ...shop.socials,
        facebook: socials.facebook || shop.socials.facebook,
        instagram: socials.instagram || shop.socials.instagram,
        youtube: socials.youtube || shop.socials.youtube,
        tiktok: socials.tiktok || shop.socials.tiktok,
      };
    }

    if (openTime) shop.openTime = openTime;
    if (closeTime) shop.closeTime = closeTime;
    if (mainCategory) shop.mainCategory = mainCategory;
    if (status) shop.status = status;
    if (mapURL) shop.mapURL = mapURL;

    await shop.save();

    return res.status(200).json({
      success: true,
      message: "Shop information updated successfully.",
      data: { shop },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating shop information.",
      error: error.message,
    });
  }
};

const getShopStats = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shopObjId = mongoose.Types.ObjectId.createFromHexString(shopId);

    // ----- TỔNG ĐƠN HÀNG -----
    const totalOrders = await Order.countDocuments({ shop: shopObjId });

    // ----- TỔNG DOANH THU -----
    const totalIncomeData = await Order.aggregate([
      { $match: { shop: shopObjId } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);
    const totalIncome = totalIncomeData[0]?.total || 0;

    // ----- TỔNG SẢN PHẨM BÁN -----
    const totalSalesData = await Order.aggregate([
      { $match: { shop: shopObjId } },
      {
        $group: {
          _id: null,
          sales: { $sum: "$total" }, // hoặc sum qty nếu bạn có field qty
        },
      },
    ]);
    const totalSales = totalSalesData[0]?.sales || 0;

    // ----- FOLLOWERS (tạm thời random) -----
    const totalFollowers = await Shop.findById(shopId).then(
      (shop) => shop.followers.length
    );

    // ----- TRẢ KẾT QUẢ -----
    return res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalIncome,
        totalOrders,
        totalFollowers,

        // bạn có thể tính growth từ bảng thống kê hoặc bỏ đi
        salesGrowth: 4.5,
        incomeGrowth: 4.5,
        ordersGrowth: 4.5,
        followersGrowth: 4.5,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getShopIncome = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shopObjId = mongoose.Types.ObjectId.createFromHexString(shopId);

    const data = await Order.aggregate([
      { $match: { shop: shopObjId } },
      {
        $group: {
          _id: { $month: "$createdAt" },
          income: { $sum: "$total" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formatted = months.map((m, i) => ({
      month: m,
      income: data.find((d) => d._id === i + 1)?.income || 0,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getShopCategoryDistribution = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shopObjId = mongoose.Types.ObjectId.createFromHexString(shopId);

    const data = await Product.aggregate([
      { $match: { shop: shopObjId } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);

    const formatted = data.map((d) => ({
      type: d._id,
      value: d.count,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

const getShopTopProducts = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shopObjId = mongoose.Types.ObjectId.createFromHexString(shopId);

    const data = await Order.aggregate([
      { $match: { shop: shopObjId } },
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.product",
          sales: { $sum: "$products.quantity" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetail",
        },
      },
      { $unwind: "$productDetail" },
      { $sort: { sales: -1 } },
      { $limit: 10 },
    ]);

    return res.status(200).json({
      success: true,
      data: data.map((d) => ({
        product: {
          _id: d.productDetail._id,
          name: d.productDetail.name,
          slug: d.productDetail.slug,
          image: d.productDetail.images[0],
        },
        sales: d.sales,
      })),
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

const getShopRecentOrders = async (req, res) => {
  try {
    const { shopId } = req.params;

    const orders = await Order.find({ shop: shopId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("orderBy", "fullName avatar email")
      .select("orderId total orderStatus orderBy createdAt");

    return res.status(200).json({ success: true, data: orders });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

const getShopNewProduct = async (req, res) => {
  try {
    const { shopId } = req.params;

    // Lấy ngày cách đây 1 tháng
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Query sản phẩm tạo từ 1 tháng trở lại đây
    const products = await Product.find({
      shop: shopId,
      createdAt: { $gte: oneMonthAgo }, // chỉ lấy sản phẩm mới trong 1 tháng
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Error fetching new products:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching new products.",
      error: error.message,
    });
  }
};

const getFollowStats = async (req, res) => {
  try {
    const { shopId } = req.params;

    const shopObjId = mongoose.Types.ObjectId.createFromHexString(shopId);
    const now = new Date();
    const year = now.getFullYear();

    const startYear = new Date(year, 0, 1);
    const endYear = new Date(year + 1, 0, 1);

    const data = await ShopFollowHistory.aggregate([
      {
        $match: {
          shop: shopObjId,
          createdAt: { $gte: startYear, $lt: endYear },
        },
      },
      {
        $addFields: {
          month: { $month: "$createdAt" }, // 1-12
        },
      },
      { $sort: { user: 1, createdAt: 1 } },
      {
        $group: {
          _id: { user: "$user", month: "$month" },
          lastAction: { $last: "$action" }, // Lấy hành động cuối cùng của user trong tháng
        },
      },
      {
        $group: {
          _id: "$_id.month",
          actions: { $push: "$lastAction" },
        },
      },
      {
        $project: {
          month: "$_id",
          follow: {
            $size: {
              $filter: {
                input: "$actions",
                as: "a",
                cond: { $eq: ["$$a", "follow"] },
              },
            },
          },
          unfollow: {
            $size: {
              $filter: {
                input: "$actions",
                as: "a",
                cond: { $eq: ["$$a", "unfollow"] },
              },
            },
          },
        },
      },
      { $sort: { month: 1 } },
    ]);

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const formatted = months.map((m, i) => {
      const monthData = data.find((d) => d.month === i + 1);
      return {
        month: m,
        follow: monthData?.follow || 0,
        unfollow: monthData?.unfollow || 0,
      };
    });

    return res.status(200).json({ success: true, year, data: formatted });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: err.message });
  }
};

module.exports = {
  createSampleShop,
  createShop,
  getShopBySlug,
  getAllShops,
  getMyShops,
  getFollowedShops,
  addShopCategory,
  updateShopCategory,
  updateShopInfo,
  getShopStats,
  getShopIncome,
  getShopCategoryDistribution,
  getShopTopProducts,
  getShopRecentOrders,
  followShop,
  unfollowShop,
  getShopProductRatings,
  getShopTopCustomers,
  getShopNewProduct,
  getFollowStats,
};
