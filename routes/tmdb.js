const router = require("express").Router();
const {
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
} = require("../controllers/tmdb");

//--------------------- Movie Routes ---------------------//
router.get('/movie/trending', getTrendingMovie)
router.get('/movie/trailer/:id', getMovieTrailer)
router.get('/movie/detail/:id', getMovieDetail)
router.get('/movie/credit/:id', getMovieCredit)
router.get('/movie/similar/:id', getSimilarMovies)
router.get('/movie/:category', getMoviesByCategory)
//--------------------- TV Show Routes ---------------------//
router.get('/trending', getTrendingTVShow)
router.get('/trailer/:id', getTVShowTrailer)
router.get('/detail/:id', getTVShowDetail)
router.get('/credit/:id', getTVShowCredit)
router.get('/similar/:id', getSimilarTVShow)
router.get('/:category', getTVShowByCategory)
router.get('/detail/:id/season/:season_number', getTVShowEpisode)
//--------------------- Search Route ---------------------//
router.get('/search', searchContent)

module.exports = router;


