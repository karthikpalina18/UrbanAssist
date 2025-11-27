const express = require('express');
const router = express.Router();
const {
  geocode,
  reverseGeocode,
  distance,
  directions,
  autocomplete,
  placeDetails
} = require('../controllers/mapController');

router.get('/geocode', geocode);
router.get('/reverse-geocode', reverseGeocode);
router.get('/distance', distance);
router.get('/directions', directions);
router.get('/autocomplete', autocomplete);
router.get('/place-details', placeDetails);

module.exports = router;