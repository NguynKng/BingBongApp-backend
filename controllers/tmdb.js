const { fetchFromTMDB } = require("../services/tmdb/tmdb");

//--------------------- Movie Controllers ---------------------//
const getTrendingMovie = async (req, res) => {
  try {
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/trending/movie/day?language=en-US`
    );
    // Shuffle mảng
    const shuffled = data.results.sort(() => 0.5 - Math.random());

    // Lấy 5 phim đầu tiên
    const randomFive = shuffled.slice(0, 5);
    return res.status(200).json({ content: randomFive, success: true });
  } catch (error) {
    console.error("Error fetching trending movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getA = async (req, res) => {
  try {
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/trending/movie/day?language=en-US`
    );
    const randomMovie =
      data.results[Math.floor(Math.random() * data.results?.length)];
    return res.status(200).json({ content: randomMovie, success: true });
  } catch (error) {
    console.error("Error fetching trending movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getMovieTrailer = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/movie/${id}/videos?language=en-US`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching trailer movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getMovieDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/movie/${id}?language=en-US`
    );
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching detail movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getSimilarMovies = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/movie/${id}/similar?language=en-US&page=1`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching similar movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getMoviesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/movie/${category}?language=en-US&page=1`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching movies by category:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getMovieCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/movie/${id}/credits?language=en-US`
    );
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching movie credit:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

//--------------------- TV Show Controllers ---------------------//
const getTrendingTVShow = async (req, res) => {
  try {
    const data = await fetchFromTMDB(
      "https://api.themoviedb.org/3/trending/tv/day?language=en-US"
    );
    const randomMovie =
      data.results[Math.floor(Math.random() * data.results?.length)];
    return res.status(200).json({ content: randomMovie, success: true });
  } catch (error) {
    console.error("Error fetching trending movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getTVShowTrailer = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/tv/${id}/videos?language=en-US`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching trailer movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getTVShowDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/tv/${id}?language=en-US`
    );
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching detail movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getSimilarTVShow = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/tv/${id}/similar?language=en-US&page=1`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching similar movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getTVShowByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/tv/${category}?language=en-US&page=1`
    );
    return res.status(200).json({ content: data.results, success: true });
  } catch (error) {
    console.error("Error fetching movies by category:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getTVShowCredit = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/tv/${id}/credits?language=en-US`
    );
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching credit movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

const getTVShowEpisode = async (req, res) => {
  try {
    const { id, season_number } = req.params;
    const data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/tv/${id}/season/${season_number}?language=en-US`
    );
    return res.status(200).json({ content: data, success: true });
  } catch (error) {
    console.error("Error fetching episode movies:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

//--------------------- TMDB Search Controllers ---------------------//
const searchContent = async (req, res) => {
  try {
    const listContent = ["person", "tv", "movie"];
    const { content, query } = req.query;

    if (!listContent.includes(content))
      return res
        .status(400)
        .json({ message: "Invalid content type", success: false });

    let data = await fetchFromTMDB(
      `https://api.themoviedb.org/3/search/${content}?query=${query}&include_adult=false&language=en-US&page=1`
    );

    if (data.results.length === 0)
      return res
        .status(404)
        .json({ message: "No results found", success: false });

    return res.status(200).json({ data: data.results, success: true });
  } catch (error) {
    console.error("Error searching for person:", error.message);
    return res
      .status(500)
      .json({ message: "Internal server error", success: false });
  }
};

module.exports = {
  getTrendingMovie,
  getMovieTrailer,
  getMovieDetail,
  getSimilarMovies,
  getMoviesByCategory,
  getMovieCredit,
  getTrendingTVShow,
  getTVShowTrailer,
  getTVShowDetail,
  getSimilarTVShow,
  getTVShowByCategory,
  getTVShowCredit,
  getTVShowEpisode,
  searchContent,
};
