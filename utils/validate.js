function removeVietnameseTones(str) {
  return str
    .normalize("NFD") // tách dấu khỏi ký tự
    .replace(/[\u0300-\u036f]/g, "") // xóa dấu
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-"); // thay khoảng trắng bằng dấu gạch
}

module.exports = { removeVietnameseTones };
