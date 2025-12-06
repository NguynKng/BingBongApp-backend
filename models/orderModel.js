const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      default: () => "ORD-" + uuidv4().split("-")[0].toUpperCase(), // ví dụ: ORD-A1B2C3D4
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variant: mongoose.Schema.Types.ObjectId,
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    total: {
      // ✅ Tổng giá trị đơn hàng
      type: Number,
      required: true,
    },
    shipping: {
      // ✅ Địa chỉ giao hàng
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      phoneNumber: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      country: { type: String, required: true },
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipping", "Completed", "Cancelled"],
      default: "Pending",
      required: true,
    },
    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    confirmedAt: { type: Date, default: null },
    shippingAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
