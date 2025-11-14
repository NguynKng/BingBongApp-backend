const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const userModel = require("../models/userModel");

// =========================
// 🛒 ADD TO CART
// =========================
const addToCart = async (req, res) => {
  const { _id: userId } = req.user;
  const { productId, variantId } = req.body;
  const quantity = 1;

  try {
    const product = await productModel.findById(productId).populate("shop");
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    // 🔹 Nếu có variant thì tìm variant tương ứng
    let selectedVariant = null;
    if (variantId) {
      selectedVariant = product.variants.find(
        (v) => v._id.toString() === variantId
      );
      if (!selectedVariant)
        return res
          .status(400)
          .json({ success: false, message: "Variant not found." });
    }

    // 🔹 Tính giá
    const price =
      selectedVariant?.price ??
      product.basePrice - (product.basePrice * product.discount) / 100;

    // 🔹 Kiểm tra tồn kho
    const availableStock = selectedVariant?.stock;
    if (!availableStock || availableStock <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Product is out of stock." });
    }

    // 🔹 Tìm giỏ hàng
    let cart = await cartModel.findOne({ orderBy: userId });
    if (!cart) cart = new cartModel({ orderBy: userId, items: [], total: 0 });

    // 🔹 Tìm item trùng (cùng product + variant)
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        (!variantId || item.variant?._id.toString() === variantId)
    );

    const totalQuantityInCart = existingItem
      ? existingItem.quantity + quantity
      : quantity;

    // ❌ Nếu vượt stock → báo lỗi
    if (totalQuantityInCart > availableStock) {
      return res.status(400).json({
        success: false,
        message: `Only ${availableStock} item(s) available in stock.`,
      });
    }

    // ✅ Cập nhật item
    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.price = price * existingItem.quantity;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId,
        quantity,
        price: price * quantity,
      });
    }

    // 🔹 Cập nhật tổng tiền
    cart.total = cart.items.reduce((sum, item) => sum + item.price, 0);
    await cart.save();

    await userModel.findByIdAndUpdate(userId, { cart: cart._id });

    const updatedCart = await cartModel.findById(cart._id).populate({
      path: "items.product",
      populate: { path: "shop", select: "slug name" },
    });

    return res.status(200).json({
      success: true,
      message: "Product added to cart.",
      data: updatedCart,
    });
  } catch (err) {
    console.error("❌ addToCart Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error adding product to cart." });
  }
};

// =========================
// 🛍️ GET USER CART
// =========================
const getUserCart = async (req, res) => {
  const { _id: userId } = req.user;

  try {
    const cart = await cartModel.findOne({ orderBy: userId }).populate({
      path: "items.product",
      populate: { path: "shop", select: "slug name" },
    });

    if (!cart)
      return res.status(200).json({
        success: true,
        message: "Cart is empty.",
        data: { items: [], total: 0 },
      });

    return res.status(200).json({ success: true, data: cart });
  } catch (err) {
    console.error("❌ getUserCart Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching cart." });
  }
};

// =========================
// ❌ REMOVE FROM CART
// =========================
const removeFromCart = async (req, res) => {
  const { _id: userId } = req.user;
  const { productId, variantId } = req.params;

  try {
    let cart = await cartModel.findOne({ orderBy: userId });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found." });

    // 🔹 Xóa đúng sản phẩm (cùng product + variant)
    cart.items = cart.items.filter(
      (item) =>
        !(
          item.product.toString() === productId &&
          (!variantId || item.variant?._id.toString() === variantId)
        )
    );

    cart.total = cart.items.reduce((sum, item) => sum + item.price, 0);
    await cart.save();

    const updatedCart = await cartModel.findById(cart._id).populate({
      path: "items.product",
      populate: { path: "shop", select: "slug name" },
    });

    return res.status(200).json({
      success: true,
      message: "Product removed from cart.",
      data: updatedCart,
    });
  } catch (err) {
    console.error("❌ removeFromCart Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error removing product from cart." });
  }
};

// =========================
// 🧹 CLEAR CART
// =========================
const clearCart = async (req, res) => {
  const { _id: userId } = req.user;

  try {
    const cart = await cartModel.findOne({ orderBy: userId });
    if (!cart)
      return res
        .status(200)
        .json({ success: true, message: "Cart is already empty." });

    await cartModel.deleteOne({ _id: cart._id });

    return res
      .status(200)
      .json({ success: true, message: "Cart successfully cleared." });
  } catch (err) {
    console.error("❌ clearCart Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error clearing cart." });
  }
};

const minusFromCart = async (req, res) => {
  const { _id: userId } = req.user;
  const { productId, variantId } = req.body;

  try {
    let cart = await cartModel.findOne({ orderBy: userId });
    if (!cart)
      return res
        .status(404)
        .json({ success: false, message: "Cart not found." });

    const product = await productModel.findById(productId);
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });

    // 🔹 Xác định variant nếu có
    const selectedVariant = variantId
      ? product.variants.find((v) => v._id.toString() === variantId)
      : null;

    const price =
      selectedVariant?.price ??
      product.basePrice - (product.basePrice * product.discount) / 100;

    // 🔹 Tìm sản phẩm trong giỏ hàng
    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId &&
        (!variantId || item.variant?._id.toString() === variantId)
    );

    if (!existingItem)
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart." });

    // 🔹 Nếu còn > 1 → giảm số lượng
    if (existingItem.quantity > 1) {
      existingItem.quantity -= 1;
      existingItem.price = price * existingItem.quantity;
    } else {
      // 🔹 Nếu còn 1 → xóa khỏi giỏ hàng
      cart.items = cart.items.filter(
        (item) =>
          !(
            item.product.toString() === productId &&
            (!variantId || item.variant?._id.toString() === variantId)
          )
      );
    }

    // 🔹 Cập nhật tổng tiền
    cart.total = cart.items.reduce((sum, item) => sum + item.price, 0);
    await cart.save();

    const updatedCart = await cartModel.findById(cart._id).populate({
      path: "items.product",
      populate: { path: "shop", select: "slug name" },
    });

    return res.status(200).json({
      success: true,
      message: "Product quantity updated (decreased).",
      data: updatedCart,
    });
  } catch (err) {
    console.error("❌ minusFromCart Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error decreasing product quantity." });
  }
};

module.exports = {
  addToCart,
  getUserCart,
  removeFromCart,
  clearCart,
  minusFromCart,
};
