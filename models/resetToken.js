const mongoose = require("mongoose");

const resetTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["resetPassword", "verifyAccount"],
      default: "resetPassword",
    },
    expiresAt: {
      type: Date
    },
  },
  {
    timestamps: true,
  }
);

// Middleware để luôn set expiresAt = 1 phút sau khi tạo
resetTokenSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 60 * 1000); // 1 phút
  }
  next();
});

module.exports = mongoose.model("ResetToken", resetTokenSchema);
