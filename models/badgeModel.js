const mongoose = require('mongoose');

const BadgeSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  icon: { 
    type: String, 
    required: true // URL hoặc path ảnh huy hiệu
  },

  condition: {
    type: {
      type: String,
      enum: [
        "account_age",     // tuổi tài khoản
        "posts_count",     // số bài viết đã đăng
        "likes_received",  // số lượt like nhận được
        "friends_count",   // số lượng bạn bè
        "comments_count",  // số comment đã viết
        "active_days",     // số ngày hoạt động
        "custom_event"     // sự kiện đặc biệt
      ],
      required: true
    },
    operator: {
      type: String,
      enum: [">=", "<=", "==", ">", "<"],
      default: ">="
    },
    value: { 
      type: Number, 
      required: true // giá trị so sánh
    },
    event: {
      type: String, 
      default: null // tên event (nếu dùng custom_event)
    }
  },

  // Cấp độ huy hiệu (nếu có nhiều level cho 1 loại)
  level: { 
    type: Number, 
    default: 1 
  },

  // Trạng thái
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Badge', BadgeSchema);
