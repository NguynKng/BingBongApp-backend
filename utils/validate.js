function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhoneNumber(phone) {
    const vnPhoneRegex = /^(0[3|5|7|8|9])+([0-9]{8})$/;
    const intlPhoneRegex = /^\+84[3|5|7|8|9][0-9]{8}$/;
    const cleanPhone = phone.replace(/\s+/g, '');
    return vnPhoneRegex.test(cleanPhone) || intlPhoneRegex.test(cleanPhone);
}

module.exports = { removeVietnameseTones, validateEmail, validatePhoneNumber };
