const mongoose = require("mongoose");

const { Schema } = mongoose;

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    avatar: {
      type: String, // URL file
      default: "default-avatar",
    },

    coverPhoto: {
      type: String, // URL file
      default: "background-gray-default",
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    moderators: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    pendingMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ⭐ TAGS (từ khóa group)
    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // ⭐ RULES (nội quy nhóm)
    rules: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          default: "",
        },
      },
    ],

    settings: {
      allowMemberPost: {
        type: Boolean,
        default: true,
      },
      requireJoinApproval: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Khi tạo group → auto thêm createdBy vào admins + members
GroupSchema.pre("save", function (next) {
  if (this.isNew) {
    if (!this.admins.includes(this.createdBy)) {
      this.admins.push(this.createdBy);
    }
    if (!this.members.includes(this.createdBy)) {
      this.members.push(this.createdBy);
    }
  }
  next();
});

module.exports = mongoose.model("Group", GroupSchema);
