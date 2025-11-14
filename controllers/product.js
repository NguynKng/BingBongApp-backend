const Product = require("../models/productModel");
const Shop = require("../models/shopModel");
const path = require("path");
const fs = require("fs");

const isShopOwner = async (userId, shopId) => {
  const shop = await Shop.findById(shopId);
  return shop && shop.owner.toString() === userId.toString();
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      basePrice,
      discount,
      brand,
      variants,
      shop,
      status,
    } = req.body;

    // 1️⃣ Kiểm tra các trường bắt buộc
    if (
      !name ||
      !category ||
      !basePrice ||
      !shop ||
      !description ||
      variants.length == 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin sản phẩm",
      });
    }

    if (!shop) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng thêm id cửa hàng",
      });
    }

    if (!(await isShopOwner(req.user._id, shop))) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền tạo sản phẩm cho cửa hàng này.",
      });
    }

    const existShop = await Shop.findById(shop);

    if (!existShop) {
      return res.status(404).json({
        success: false,
        message: "Cửa hàng không tồn tại",
      });
    }

    // 2️⃣ Parse variants (nếu là JSON string)
    let parsedVariants = [];
    if (typeof variants === "string") {
      try {
        parsedVariants = JSON.parse(variants);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Variants không đúng định dạng JSON.",
        });
      }
    } else if (Array.isArray(variants)) {
      parsedVariants = variants;
    }

    // 3️⃣ Validate từng variant
    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];
      if (!v.name || !v.price || !v.stock) {
        return res.status(400).json({
          success: false,
          message: `Vui lòng điền đầy đủ thông tin cho variant thứ ${i + 1}.`,
        });
      }
    }

    // 4️⃣ Kiểm tra tên sản phẩm trùng trong cùng shop
    const existed = await Product.findOne({ shop, name: name.trim() });
    if (existed) {
      return res.status(409).json({
        success: false,
        message: "Tên sản phẩm đã tồn tại trong shop này.",
      });
    }

    // 5️⃣ Xử lý ảnh upload
    const mainImages = req.files?.mainImages || [];
    const variantImages = req.files?.variantImages || [];

    if (mainImages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng tải lên ít nhất 1 ảnh chính cho sản phẩm.",
      });
    }

    if (mainImages.length > 10) {
      return res.status(400).json({
        success: false,
        message: "Chỉ được phép tải tối đa 10 ảnh chính.",
      });
    }

    const mainImagePaths = mainImages.map(
      (file) => `/uploads/products/${file.filename}`
    );

    const updatedVariants = parsedVariants.map((variant, index) => {
      const imageFile = variantImages[index];
      return {
        ...variant,
        price: Number(variant.price),
        stock: Number(variant.stock || 0),
        image: imageFile ? `/uploads/products/${imageFile.filename}` : null,
      };
    });

    // 6️⃣ Tạo product mới
    const newProduct = new Product({
      shop,
      name: name.trim(),
      description,
      category,
      basePrice: Number(basePrice),
      discount: Number(discount || 0),
      brand,
      images: mainImagePaths,
      variants: updatedVariants,
      status,
    });

    await newProduct.save();

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công.",
      product: newProduct,
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo product:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tạo sản phẩm.",
      error: error.message,
    });
  }
};

const updateProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      basePrice,
      discount,
      brand,
      shop,
      status,
      variants,
      deletedImagePath, // client gửi danh sách ảnh đã xoá
    } = req.body;

    // 1️⃣ Kiểm tra các trường bắt buộc
    if (
      !name ||
      !category ||
      !basePrice ||
      !shop ||
      !description ||
      variants.length == 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin sản phẩm",
      });
    }

    if (!shop) {
      return res.status(400).json({
        success: false,
        message: "Thiếu ID cửa hàng.",
      });
    }

    // 🔐 Kiểm tra quyền sở hữu shop
    if (!(await isShopOwner(req.user._id, shop))) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa sản phẩm của shop này.",
      });
    }

    // ✅ Tìm product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // ✅ Kiểm tra trùng tên trong cùng shop
    if (name.trim() !== product.name) {
      const existed = await Product.findOne({ shop, name: name.trim() });
      if (existed) {
        return res.status(409).json({
          success: false,
          message: "Tên sản phẩm đã tồn tại trong shop này.",
        });
      }
    }

    // ✅ Parse dữ liệu variant
    let parsedVariants = [];
    if (typeof variants === "string") {
      try {
        parsedVariants = JSON.parse(variants);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Variants không đúng định dạng JSON.",
        });
      }
    } else if (Array.isArray(variants)) {
      parsedVariants = variants;
    }

    // 3️⃣ Validate từng variant
    for (let i = 0; i < parsedVariants.length; i++) {
      const v = parsedVariants[i];
      if (!v.name || !v.price || !v.stock) {
        return res.status(400).json({
          success: false,
          message: `Vui lòng điền đầy đủ thông tin cho variant thứ ${i + 1}.`,
        });
      }
    }

    // ✅ Parse danh sách ảnh bị xoá
    let deletedPaths = [];
    if (typeof deletedImagePath === "string") {
      deletedPaths = JSON.parse(deletedImagePath);
    } else if (Array.isArray(deletedImagePath)) {
      deletedPaths = deletedImagePath;
    }

    // ✅ Lấy file mới upload
    const newMainFiles = req.files?.mainImages || [];
    const newVariantFiles = req.files?.variantImages || [];

    // ✅ Chuyển file ảnh chính mới thành path
    const newMainImagePaths = newMainFiles.map(
      (f) => `/uploads/products/${f.filename}`
    );

    // ✅ Xoá ảnh chính bị xoá khỏi folder
    deletedPaths.forEach((img) => {
      const filePath = path.join(__dirname, `../public${img}`);
      console.log("File bi xoa", filePath);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    // ✅ Ảnh chính còn giữ lại (trừ những ảnh bị xoá)
    const keptMainImages = product.images.filter(
      (img) => !deletedPaths.includes(img)
    );

    // ✅ Danh sách ảnh chính cuối cùng
    const finalMainImages = [...keptMainImages, ...newMainImagePaths];

    const updatedVariants = parsedVariants.map((variant, index) => {
      const newFile = newVariantFiles[variant.imageIndex]; // client gửi newImageIndex nếu có upload ảnh mới
      let finalImage = variant.image ? variant.image.path : null;

      if (newFile) {
        // Nếu có upload mới → thay bằng ảnh mới
        finalImage = `/uploads/products/${newFile.filename}`;
      } else if (variant.image === null) {
        // Nếu xoá ảnh ở client
        if (product.variants[index]?.image) {
          const oldPath = path.join(
            __dirname,
            `../public${product.variants[index].image.path}`
          );
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
        finalImage = null;
      }

      return {
        ...variant,
        image: finalImage,
        price: Number(variant.price),
        stock: Number(variant.stock || 0),
      };
    });

    // ✅ Cập nhật product
    product.name = name ?? product.name;
    product.description = description ?? product.description;
    product.category = category ?? product.category;
    product.basePrice = basePrice ?? product.basePrice;
    product.discount = discount ?? product.discount;
    product.brand = brand ?? product.brand;
    product.images = finalMainImages;
    product.variants = updatedVariants;
    product.status = status ?? product.status;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công.",
      product,
    });
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật product:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật sản phẩm.",
      error: error.message,
    });
  }
};

const getProductBySlug = async (req, res) => {
  const { slug, shopId } = req.params;
  try {
    const product = await Product.findOne({ slug, shop: shopId }).populate(
      "ratings.postedBy",
      "fullName avatar slug"
    );
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy sản phẩm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy sản phẩm.",
      error: error.message,
    });
  }
};

const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy sản phẩm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy sản phẩm.",
      error: error.message,
    });
  }
};

const getProductsByShop = async (req, res) => {
  const { shopId } = req.params;
  const { minPrice, maxPrice, category, isDiscounted, name } = req.query;

  try {
    const filter = { shop: shopId };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }

    // 🏷️ Nếu có truyền category (slug)
    if (category) {
      const shop = await Shop.findById(shopId);
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cửa hàng.",
        });
      }

      const matchedCategory = shop.categories.find(
        (cat) => cat.slug === category
      );

      if (!matchedCategory) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
          message: "Danh mục không tồn tại trong shop này.",
        });
      }

      filter.category = matchedCategory.name;
    }

    // 💸 3. Lọc theo sản phẩm có khuyến mãi
    if (isDiscounted === "true") {
      filter.discount = { $gt: 0 };
    }

    // 🧾 4. Truy vấn dữ liệu gốc
    let products = await Product.find(filter).sort({ createdAt: -1 });

    // 🪙 5. Lọc lại theo giá thực tế (đã trừ discount)
    if (minPrice || maxPrice) {
      const min = Number(minPrice) || 0;
      const max = Number(maxPrice) || Infinity;

      products = products.filter((p) => {
        const priceAfterDiscount =
          p.basePrice - (p.basePrice * p.discount) / 100;
        return priceAfterDiscount >= min && priceAfterDiscount <= max;
      });
    }

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("❌ Lỗi khi lấy sản phẩm:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy sản phẩm.",
      error: error.message,
    });
  }
};

const rateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { star, comment } = req.body;
    const userId = req.user._id; // assuming you use auth middleware

    if (!star || star < 1 || star > 5) {
      return res
        .status(400)
        .json({ success: false, message: "Star rating must be 1-5." });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }

    const newRating = {
      star,
      comment,
      postedBy: userId,
      createdAt: new Date(),
    };

    // add new
    product.ratings.push(newRating);

    // recalculate average rating
    const totalStars = product.ratings.reduce((acc, r) => acc + r.star, 0);
    product.totalRating = product.ratings.length
      ? (totalStars / product.ratings.length).toFixed(1)
      : 0;

    await product.save();
    // populate riêng rating mới nhất
    const populatedProduct = await Product.populate(product, {
      path: "ratings.postedBy",
      select: "fullName avatar slug",
    });

    const populatedRating =
      populatedProduct.ratings[populatedProduct.ratings.length - 1];

    return res.status(200).json({
      success: true,
      message: "Rating submitted successfully.",
      data: populatedRating,
    });
  } catch (err) {
    console.error("Rate Product Error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error.",
    });
  }
};

module.exports = {
  createProduct,
  getProductsByShop,
  getProductBySlug,
  getProductById,
  updateProductById,
  rateProduct,
};
