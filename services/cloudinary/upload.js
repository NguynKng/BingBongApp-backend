const cloudinary = require("cloudinary").v2;
const {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
} = require("../../config/envVars");
const { CLOUDINARY_FOLDERS } = require("./constant");

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (buffer, type) => {
  const folder = CLOUDINARY_FOLDERS[type] || "default";
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder, resource_type: "auto" }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      })
      .end(buffer);
  });
};

const deleteFromCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    throw err;
  }
};

const deleteManyFromCloudinary = async (publicIds = []) => {
  try {
    const results = [];

    for (const id of publicIds) {
      const res = await cloudinary.uploader.destroy(id)
      results.push(res);
    }

    return results;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
    deleteFromCloudinary,
    deleteManyFromCloudinary,
};
