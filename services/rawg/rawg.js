const axios = require("axios");
const { RAWG_API_KEY } = require("../../config/envVars");

const fetchFromRAWG = async (url) => {
  const separator = url.includes("?") ? "&" : "?";
  const fullUrl = `${url}${separator}key=${RAWG_API_KEY}`;

  const response = await axios.get(fullUrl, {
    headers: { accept: "application/json" },
  });

  if (!response) throw new Error("Failed to fetch data from RAWG");

  return response.data;
};

module.exports = { fetchFromRAWG };
