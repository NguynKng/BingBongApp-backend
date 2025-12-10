const Product = require("../models/productModel");
const Shop = require("../models/shopModel");
const path = require("path");
const fs = require("fs");
const { uploadToCloudinary, deleteFromCloudinary } = require("../services/cloudinary/upload");

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

    // Upload main images
    const uploadedMainImages = [];
    for (let img of mainImages) {
      const result = await uploadToCloudinary(img.buffer, "product");
      const imagePublicId = result.public_id;
      uploadedMainImages.push(imagePublicId);
    }

    // Upload variant images theo index
    const updatedVariants = [];
    for (let i = 0; i < parsedVariants.length; i++) {
      const variant = parsedVariants[i];
      const variantImgFile = variantImages[i];

      let uploadedImg = null;
      if (variantImgFile) {
        const cloud = await uploadToCloudinary(
          variantImgFile.buffer,
          "product"
        );
        const imagePublicId = cloud.public_id;
        uploadedImg = imagePublicId;
      }

      updatedVariants.push({
        ...variant,
        price: Number(variant.price),
        stock: Number(variant.stock || 0),
        image: uploadedImg,
      });
    }

    // 6️⃣ Tạo product mới
    const newProduct = new Product({
      shop,
      name: name.trim(),
      description,
      category,
      basePrice: Number(basePrice),
      discount: Number(discount || 0),
      brand,
      images: uploadedMainImages,
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
      deletedImagePath, // = danh sách publicId cần xóa
    } = req.body;

    // 1️⃣ Validate cơ bản
    if (!name || !category || !basePrice || !shop || !description) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin sản phẩm",
      });
    }

    if (!(await isShopOwner(req.user._id, shop))) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền sửa sản phẩm của shop này.",
      });
    }

    // 2️⃣ Tìm product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    // 3️⃣ Parse variants
    let parsedVariants =
      typeof variants === "string" ? JSON.parse(variants) : variants;

    // 4️⃣ Parse danh sách ảnh bị xoá
    const deletedPublicIds =
      typeof deletedImagePath === "string"
        ? JSON.parse(deletedImagePath)
        : deletedImagePath || [];

    // 5️⃣ Xoá ảnh trên Cloudinary
    for (const pubId of deletedPublicIds) {
      try {
        await deleteFromCloudinary(pubId);
      } catch (err) {
        console.log("⚠️ Lỗi khi xoá ảnh:", pubId);
      }
    }

    // 6️⃣ Lấy file upload mới
    const newMainFiles = req.files?.mainImages || [];
    const newVariantFiles = req.files?.variantImages || [];

    // 7️⃣ Upload ảnh chính mới
    const uploadedMainImages = [];
    for (let file of newMainFiles) {
      const uploaded = await uploadToCloudinary(file.buffer, "product");
      uploadedMainImages.push(uploaded.public_id);
    }

    // 8️⃣ Lọc ảnh chính còn giữ lại
    const keptMainImages = product.images.filter(
      (img) => !deletedPublicIds.includes(img)
    );

    const finalMainImages = [...keptMainImages, ...uploadedMainImages];

    // 9️⃣ Xử lý variants + upload ảnh variant mới
    const finalVariants = await Promise.all(
      parsedVariants.map(async (variant, index) => {
        let finalImage = product.variants[index]?.image || null;
        const newFile = newVariantFiles[index];

        // Nếu bị xoá
        if (finalImage) {
            await deleteFromCloudinary(finalImage);
            finalImage = null;
        }

        // Nếu có upload ảnh mới
        if (newFile) {
          const uploaded = await uploadToCloudinary(
            newFile.buffer,
            "product"
          );
          finalImage = uploaded.public_id;
        }

        return {
          ...variant,
          price: Number(variant.price),
          stock: Number(variant.stock),
          image: finalImage,
        };
      })
    );

    // 🔟 Update Product
    product.name = name;
    product.description = description;
    product.category = category;
    product.basePrice = Number(basePrice);
    product.discount = Number(discount || 0);
    product.brand = brand;
    product.images = finalMainImages;
    product.variants = finalVariants;
    product.status = status;

    await product.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
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
