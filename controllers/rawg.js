const { fetchFromRAWG } = require("../services/rawg/rawg");

const RAWG_BASE = "https://api.rawg.io/api";

//--------------------- Game List ---------------------//
const getGames = async (req, res) => {
  try {
    const { page = 1, page_size = 20, ordering, genres, platforms, search } = req.query;

    let url = `${RAWG_BASE}/games?page=${page}&page_size=${page_size}`;
    if (ordering) url += `&ordering=${ordering}`;
    if (genres) url += `&genres=${genres}`;
    if (platforms) url += `&platforms=${platforms}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;

    const data = await fetchFromRAWG(url);
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching games:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Game Detail ---------------------//
const getGameDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromRAWG(`${RAWG_BASE}/games/${id}`);
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching game detail:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Game Screenshots ---------------------//
const getGameScreenshots = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromRAWG(`${RAWG_BASE}/games/${id}/screenshots`);
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching game screenshots:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Similar Games ---------------------//
const getSimilarGames = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromRAWG(`${RAWG_BASE}/games/${id}/game-series`);
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching similar games:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Games by Genre ---------------------//
const getGamesByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const { page = 1, page_size = 20 } = req.query;
    const data = await fetchFromRAWG(
      `${RAWG_BASE}/games?genres=${genre}&page=${page}&page_size=${page_size}&ordering=-rating`
    );
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching games by genre:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Get All Genres ---------------------//
const getGenres = async (req, res) => {
  try {
    const data = await fetchFromRAWG(`${RAWG_BASE}/genres`);
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching genres:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Search Games ---------------------//
const searchGames = async (req, res) => {
  try {
    const { query, page = 1, page_size = 20 } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Query is required", success: false });
    }
    const data = await fetchFromRAWG(
      `${RAWG_BASE}/games?search=${encodeURIComponent(query)}&page=${page}&page_size=${page_size}`
    );
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ message: "No results found", success: false });
    }
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error searching games:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Trending / Top Rated Games ---------------------//
const getTrendingGames = async (req, res) => {
  try {
    const data = await fetchFromRAWG(
      `${RAWG_BASE}/games?ordering=-added&page_size=10`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching trending games:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

//--------------------- Upcoming Games ---------------------//
const getUpcomingGames = async (req, res) => {
  try {
    const { page = 1, page_size = 20 } = req.query;

    // Lấy ngày hôm nay và 1 năm sau làm khoảng ngày lọc
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);

    const formatDate = (d) => d.toISOString().split("T")[0]; // YYYY-MM-DD
    const dateRange = `${formatDate(today)},${formatDate(nextYear)}`;

    const data = await fetchFromRAWG(
      `${RAWG_BASE}/games?dates=${dateRange}&ordering=released&page=${page}&page_size=${page_size}`
    );

    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching upcoming games:", error.message);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};

module.exports = {
  getGames,
  getGameDetail,
  getGameScreenshots,
  getSimilarGames,
  getGamesByGenre,
  getGenres,
  searchGames,
  getTrendingGames,
  getUpcomingGames,
};
