const router = require("express").Router();
const {
  getGames,
  getGameDetail,
  getGameScreenshots,
  getSimilarGames,
  getGamesByGenre,
  getGenres,
  searchGames,
  getTrendingGames,
  getUpcomingGames,
} = require("../controllers/rawg");

//--------------------- Game Routes ---------------------//
router.get("/trending", getTrendingGames);
router.get("/upcoming", getUpcomingGames);
router.get("/genres", getGenres);
router.get("/search", searchGames);
router.get("/genre/:genre", getGamesByGenre);
router.get("/detail/:id", getGameDetail);
router.get("/detail/:id/screenshots", getGameScreenshots);
router.get("/detail/:id/similar", getSimilarGames);
router.get("/", getGames);

module.exports = router;
