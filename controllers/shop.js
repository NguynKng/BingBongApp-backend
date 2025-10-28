const Shop = require("../models/shopModel");

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
      message: "Tạo shop thành công!",
      shop: newShop,
      success: true,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Lỗi server", error: error.message, success: false });
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
        message: "Shop không tìm thấy",
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
      message: "Lỗi server",
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
      message: "Lỗi server",
      error: error.message,
    });
  }
};

const getMyShops = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ token
    const shops = await Shop.find({ owner: userId }).populate("owner", "fullName avatar email slug");
    return res.status(200).json({
      success: true,
      data: shops,
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

const getFollowedShops = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy ID người dùng từ token
    const shops = await Shop.find({ followers: userId }).populate("owner", "fullName avatar email slug");
    return res.status(200).json({
      success: true,
      data: shops,
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


module.exports = { createSampleShop, getShopBySlug, getAllShops, getMyShops, getFollowedShops };
