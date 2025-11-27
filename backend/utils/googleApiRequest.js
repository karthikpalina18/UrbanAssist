const axios = require('axios');
const googleMapsConfig = require('../config/googleMaps');

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
const baseUrl = googleMapsConfig.baseUrl;

/**
 * Geocode address to coordinates
 */
const getGeocode = async (address) => {
  try {
    const response = await axios.get(`${baseUrl}/geocode/json`, {
      params: {
        address,
        key: apiKey
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    return {
      formattedAddress: result.formatted_address,
      location: result.geometry.location,
      placeId: result.place_id
    };
  } catch (error) {
    throw new Error(`Geocoding error: ${error.message}`);
  }
};

/**
 * Reverse geocode coordinates to address
 */
const getReverseGeocode = async (lat, lng) => {
  try {
    const response = await axios.get(`${baseUrl}/geocode/json`, {
      params: {
        latlng: `${lat},${lng}`,
        key: apiKey
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Reverse geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    return {
      formattedAddress: result.formatted_address,
      addressComponents: result.address_components,
      placeId: result.place_id
    };
  } catch (error) {
    throw new Error(`Reverse geocoding error: ${error.message}`);
  }
};

/**
 * Get distance and duration between two points
 */
const getDistance = async (origin, destination) => {
  try {
    const response = await axios.get(`${baseUrl}/distancematrix/json`, {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        key: apiKey,
        units: 'metric'
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Distance matrix failed: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error(`No route found: ${element.status}`);
    }

    return {
      distance: element.distance,
      duration: element.duration,
      origin: response.data.origin_addresses[0],
      destination: response.data.destination_addresses[0]
    };
  } catch (error) {
    throw new Error(`Distance calculation error: ${error.message}`);
  }
};

/**
 * Get directions between two points
 */
const getDirections = async (origin, destination) => {
  try {
    const response = await axios.get(`${baseUrl}/directions/json`, {
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        key: apiKey,
        mode: 'driving'
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Directions failed: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];

    return {
      distance: leg.distance,
      duration: leg.duration,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      steps: leg.steps.map(step => ({
        instruction: step.html_instructions,
        distance: step.distance,
        duration: step.duration,
        startLocation: step.start_location,
        endLocation: step.end_location
      })),
      polyline: route.overview_polyline.points,
      bounds: route.bounds
    };
  } catch (error) {
    throw new Error(`Directions error: ${error.message}`);
  }
};

/**
 * Get place autocomplete suggestions
 */
const getPlaceAutocomplete = async (input, location = null) => {
  try {
    const params = {
      input,
      key: apiKey,
      components: 'country:in' // Restrict to India
    };

    if (location) {
      params.location = `${location.lat},${location.lng}`;
      params.radius = 50000; // 50km radius
    }

    const response = await axios.get(`${baseUrl}/place/autocomplete/json`, { params });

    if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
      throw new Error(`Autocomplete failed: ${response.data.status}`);
    }

    return response.data.predictions.map(prediction => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting.main_text,
      secondaryText: prediction.structured_formatting.secondary_text
    }));
  } catch (error) {
    throw new Error(`Autocomplete error: ${error.message}`);
  }
};

/**
 * Get place details by place ID
 */
const getPlaceDetails = async (placeId) => {
  try {
    const response = await axios.get(`${baseUrl}/place/details/json`, {
      params: {
        place_id: placeId,
        key: apiKey,
        fields: 'name,formatted_address,geometry,address_components'
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Place details failed: ${response.data.status}`);
    }

    const result = response.data.result;
    return {
      name: result.name,
      formattedAddress: result.formatted_address,
      location: result.geometry.location,
      addressComponents: result.address_components
    };
  } catch (error) {
    throw new Error(`Place details error: ${error.message}`);
  }
};

module.exports = {
  getGeocode,
  getReverseGeocode,
  getDistance,
  getDirections,
  getPlaceAutocomplete,
  getPlaceDetails
};