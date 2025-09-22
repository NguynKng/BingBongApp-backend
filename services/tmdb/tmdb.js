const axios = require("axios");
const { TMDB_API_KEY } = require("../../config/envVars");

const fetchFromTMDB = async (url) => {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${TMDB_API_KEY}`,
    },
  };

  const response = await axios.get(url, options);

  if (!response) throw new Error("Failed to fetch data from TMDB");

  return response.data;
};

module.exports = { fetchFromTMDB };
