const orderModel = require("../models/orderModel");
const cartModel = require("../models/cartModel");
const productModel = require("../models/productModel");
const {
  sendNotification,
  sendNotificationToFriends,
} = require("./notification");
const shopModel = require("../models/shopModel");

const createOrder = async (req, res) => {
  const { _id: userId } = req.user;
  const { shipping } = req.body;

  try {
    // 🔹 Lấy giỏ hàng của user
    const cart = await cartModel.findOne({ orderBy: userId }).populate({
      path: "items.product",
      populate: { path: "shop", select: "_id name slug" },
    });

    if (!cart || cart.items.length === 0)
      return res 
        .status(400)
        .json({ success: false, message: "Your cart is empty." });

    // 🔹 Kiểm tra tồn kho cho tất cả sản phẩm trong giỏ
    for (const item of cart.items) {
      const product = await productModel.findById(item.product._id);
      if (!product)
        return res
          .status(404)
          .json({ success: false, message: "Product not found." });

      // Nếu có variant → kiểm tra variant stock
      if (item.variant) {
        const variant = product.variants.find(
          (v) => v._id.toString() === item.variant.toString()
        );
        if (!variant)
          return res
            .status(400)
            .json({ success: false, message: "Variant not found." });

        if (variant.stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for variant "${variant.name}". Only ${variant.stock} left.`,
          });
        }
      }
    }

    // 🔹 Gom sản phẩm theo shop
    const itemsByShop = {};
    cart.items.forEach((item) => {
      const shopId = item.product.shop._id.toString();
      if (!itemsByShop[shopId]) itemsByShop[shopId] = [];
      itemsByShop[shopId].push(item);
    });

    const createdOrders = [];

    // 🔹 Duyệt từng shop để tạo đơn hàng riêng
    for (const [shopId, items] of Object.entries(itemsByShop)) {
      const total = items.reduce((sum, item) => sum + item.price, 0);
      const shop = await shopModel.findById(shopId);

      const order = new orderModel({
        shop: shopId,
        products: items.map((item) => ({
          product: item.product._id,
          variant: item.variant,
          quantity: item.quantity,
          price: item.price / item.quantity, // đơn giá
        })),
        total,
        shipping,
        orderBy: userId,
      });

      await order.save();
      createdOrders.push(order);

      // 🔹 Giảm tồn kho sau khi tạo đơn
      for (const item of items) {
        const product = await productModel.findById(item.product._id);
        if (!product) continue;

        if (item.variant) {
          const variant = product.variants.find(
            (v) => v._id.toString() === item.variant._id.toString()
          );
          if (variant) variant.stock -= item.quantity;
        }

        await product.save();
      }
      await sendNotification([shop.owner], userId, "new_order", {
        orderId: order.orderId,
        shopSlug: shop.slug,
        shopName: shop.name,
        shopAvatar: shop.avatar,
      });
    }

    // 🔹 Xóa giỏ hàng sau khi tạo đơn
    await cartModel.deleteOne({ _id: cart._id });

    return res.status(201).json({
      success: true,
      message: "Orders created successfully.",
      data: createdOrders,
    });
  } catch (err) {
    console.error("❌ createOrder Error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Error creating order." });
  }
};

const getUserOrders = async (req, res) => {
  const { _id: userId } = req.user;
  try {
    const orders = await orderModel
      .find({ orderBy: userId })
      .populate("shop")
      .populate("products.product")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("❌ getUserOrders Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching user orders." });
  }
};

const getShopOrders = async (req, res) => {
  const { shopId } = req.params;
  try {
    const orders = await orderModel
      .find({ shop: shopId })
      .populate("orderBy")
      .populate("products.product")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("❌ getShopOrders Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching shop orders." });
  }
};

const getOrderById = async (req, res) => {
  const { orderId } = req.params;
  try {
    const order = await orderModel
      .findOne({ orderId })
      .populate("shop")
      .populate("orderBy")
      .populate("products.product");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("❌ getOrderById Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error fetching order." });
  }
};

const updateOrderStatus = async (req, res) => {
  const { _id: userId } = req.user;
  const { orderId, status } = req.body;
  try {
    const order = await orderModel.findOne({ orderId }).populate("shop");
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    const isShopOwner = order.shop.owner.toString() === userId.toString();
    if (!isShopOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this order.",
      });
    }
    const updateData = { orderStatus: status };
    let type;
    if (status === "Processing") {
      updateData.confirmedAt = new Date();
      type = "accepted_order";
    }
    if (status === "Shipping") {
      updateData.shippingAt = new Date();
      type = "shipping_order";
    }
    if (status === "Completed") {
      updateData.completedAt = new Date();
      type = "received_order";
    }
    if (status === "Cancelled") {
      updateData.cancelledAt = new Date();
      type = "shop_cancelled_order";
    }

    const newStatusOrder = await orderModel
      .findOneAndUpdate({ orderId }, updateData, {
        new: true,
      })
      .populate("shop")
      .populate("orderBy")
      .populate("products.product");
    await sendNotification([newStatusOrder.orderBy._id], userId, type, {
      orderId: newStatusOrder.orderId,
      shopSlug: newStatusOrder.shop.slug,
      shopName: newStatusOrder.shop.name,
      shopAvatar: newStatusOrder.shop.avatar,
    });
    return res.status(200).json({
      success: true,
      message: "Order updated successfully.",
      data: newStatusOrder,
    });
  } catch (error) {
    console.error("❌ updateOrderStatus Error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Error updating order status." });
  }
};

const cancelOrder = async (req, res) => {
  const { orderId } = req.body;
  const { _id: userId } = req.user;

  try {
    const order = await orderModel.findOne({ orderId }).populate("shop");

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    // Check owner
    if (order.orderBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to cancel this order.",
      });
    }

    // Check status
    if (order.orderStatus === "Shipping") {
      return res.status(400).json({
        success: false,
        message: "Your order is being shipped and cannot be canceled.",
      });
    }

    // Update status -> canceled
    order.orderStatus = "Cancelled";
    order.cancelledAt = new Date();
    await order.save();

    await sendNotification(
      [order.shop.owner],
      userId,
      "user_cancelled_order",
      {
        orderId: order.orderId,
      }
    );

    return res.json({
      success: true,
      message: "Order has been successfully canceled.",
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

const receiveOrder = async (req, res) => {
  const { orderId } = req.body;
  const { _id: userId } = req.user;
  try {
    const order = await orderModel.findOne({ orderId });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    // Check owner
    if (order.orderBy.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this order.",
      });
    }
    // Check status
    if (order.orderStatus !== "Shipping") {
      return res.status(400).json({
        success: false,
        message: "Only orders in 'Shipping' status can be marked as received.",
      });
    }
    // Update status -> Completed
    order.orderStatus = "Completed";
    order.completedAt = new Date();
    await order.save();

    const newUpdatedOrder = await orderModel
      .findOne({ orderId })
      .populate("shop")
      .populate("orderBy")
      .populate("products.product");
    await sendNotification(
      [newUpdatedOrder.shop.owner],
      userId,
      "received_order",
      {
        orderId: newUpdatedOrder.orderId,
      }
    );
    return res.json({
      data: newUpdatedOrder,
      success: true,
      message: "Order has been marked as received.",
    });
  } catch (error) {
    console.error("Receive order error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getShopOrders,
  getOrderById,
  updateOrderStatus,
  receiveOrder,
  cancelOrder,
};
