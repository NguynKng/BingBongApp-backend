const { NEWS_API_KEY } = require("../config/envVars");

const getTechNews = async (req, res) => {
  try {
    const url = `https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=${NEWS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error crawling the blog" });
  }
};

module.exports = {
  getTechNews,
};
