const Shop = require("../models/shopModel");
const Product = require("../models/productModel");

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

const createShop = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, categories } = req.body;
    if (!name || !description || !categories || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp đầy đủ thông tin để tạo shop",
      });
    }
    const isExistingName = await Shop.findOne({ name: name.trim() });
    if (isExistingName) {
      return res.status(400).json({
        success: false,
        message: "Tên shop đã tồn tại, vui lòng chọn tên khác",
      });
    }
    const shop = new Shop({
      owner: userId,
      name,
      description,
      categories,
    });
    await shop.save();
    return res.status(201).json({
      success: true,
      message: "Tạo shop thành công",
      data: shop,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
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
      message: "Lỗi server",
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
      message: "Lỗi server",
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
        message: "Shop không tìm thấy",
      });
    }

    // Kiểm tra danh mục đã tồn tại chưa (theo tên, không phân biệt hoa thường)
    const isExist = shop.categories.some(
      (c) => c.name.toLowerCase().trim() === category.name.toLowerCase().trim()
    );

    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Danh mục này đã tồn tại trong shop",
      });
    }

    // Thêm danh mục mới vào shop
    shop.categories.push({ name, isActive });
    await shop.save();

    return res.status(201).json({
      success: true,
      message: "Thêm danh mục thành công",
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

const updateShopCategory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { shopId } = req.params;
    const { name, isActive, _id } = req.body;

    const shop = await Shop.findOne({ _id: shopId, owner: userId });
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop không tìm thấy",
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
        message: "Tên danh mục này đã tồn tại trong shop",
      });
    }

    // 🔍 Tìm index danh mục cần update
    const categoryIndex = shop.categories.findIndex(
      (cat) => cat._id.toString() === _id
    );

    if (categoryIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Danh mục không tìm thấy",
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
      message: "Cập nhật danh mục thành công",
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
        message: "Shop không tồn tại hoặc bạn không có quyền chỉnh sửa",
      });
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
      message: "Cập nhật thông tin shop thành công",
      data: { shop },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật thông tin shop",
      error: error.message,
    });
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
};
