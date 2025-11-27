const config = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  baseUrl: 'https://maps.googleapis.com/maps/api',
  endpoints: {
    geocode: '/geocode/json',
    directions: '/directions/json',
    distanceMatrix: '/distancematrix/json',
    placeAutocomplete: '/place/autocomplete/json',
    placeDetails: '/place/details/json'
  }
};

module.exports = config;