const {
  getGeocode,
  getReverseGeocode,
  getDistance,
  getDirections,
  getPlaceAutocomplete,
  getPlaceDetails
} = require('../utils/googleApiRequest');

// @desc    Geocode address to coordinates
// @route   GET /api/maps/geocode
// @access  Public
exports.geocode = async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an address'
      });
    }

    const data = await getGeocode(address);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reverse geocode coordinates to address
// @route   GET /api/maps/reverse-geocode
// @access  Public
exports.reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    const data = await getReverseGeocode(parseFloat(lat), parseFloat(lng));
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get distance and duration between two points
// @route   GET /api/maps/distance
// @access  Public
exports.distance = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide origin and destination coordinates'
      });
    }

    const data = await getDistance(
      { lat: parseFloat(originLat), lng: parseFloat(originLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) }
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get directions between two points
// @route   GET /api/maps/directions
// @access  Public
exports.directions = async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({
        success: false,
        message: 'Please provide origin and destination coordinates'
      });
    }

    const data = await getDirections(
      { lat: parseFloat(originLat), lng: parseFloat(originLng) },
      { lat: parseFloat(destLat), lng: parseFloat(destLng) }
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get place autocomplete suggestions
// @route   GET /api/maps/autocomplete
// @access  Public
exports.autocomplete = async (req, res) => {
  try {
    const { input, lat, lng } = req.query;

    if (!input) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search input'
      });
    }

    const location = lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null;
    const data = await getPlaceAutocomplete(input, location);

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get place details
// @route   GET /api/maps/place-details
// @access  Public
exports.placeDetails = async (req, res) => {
  try {
    const { placeId } = req.query;

    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide place ID'
      });
    }

    const data = await getPlaceDetails(placeId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};