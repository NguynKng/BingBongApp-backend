const fs = require("fs");
const path = require("path");

const removeDiacritics = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
};

const deleteOldFile = (filePath) => {
  if (!filePath) return;
  const absolutePath = path.join(__dirname, `../public${filePath}`);
  console.log("Deleting old file at:", absolutePath);
  fs.unlink(absolutePath, (err) => {
    if (err && err.code !== "ENOENT") {
      console.warn("⚠️ Could not delete old file:", err.message);
    }
  });
};

module.exports = { removeDiacritics, deleteOldFile };
