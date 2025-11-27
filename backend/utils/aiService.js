const axios = require('axios');
const Provider = require('../models/Provider');
const { getDistance } = require('./googleApirequest');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';

/**
 * Get AI-based provider recommendation
 */
const getAIRecommendation = async ({ serviceId, userLat, userLng }) => {
  try {
    // Get available providers for the service
    const providers = await Provider.find({
      category: serviceId,
      status: 'approved',
      'availability.isAvailable': true
    }).select('name rating currentLocation experience completedJobs');

    if (providers.length === 0) {
      return { message: 'No providers available', providers: [] };
    }

    // Calculate distance for each provider
    const providersWithDistance = await Promise.all(
      providers.map(async (provider) => {
        try {
          const distanceData = await getDistance(
            { lat: userLat, lng: userLng },
            {
              lat: provider.currentLocation.coordinates[1],
              lng: provider.currentLocation.coordinates[0]
            }
          );

          return {
            id: provider._id,
            name: provider.name,
            rating: provider.rating.average,
            experience: provider.experience,
            completedJobs: provider.completedJobs,
            distance: distanceData.distance.value / 1000, // km
            duration: distanceData.duration.value / 60 // minutes
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validProviders = providersWithDistance.filter(p => p !== null);

    // Try to get recommendation from Flask AI service
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/predict-provider`, {
        providers: validProviders,
        userLocation: { lat: userLat, lng: userLng }
      }, { timeout: 5000 });

      return response.data;
    } catch (aiError) {
      // Fallback: Simple scoring algorithm
      console.log('AI service unavailable, using fallback algorithm');
      return getFallbackRecommendation(validProviders);
    }
  } catch (error) {
    throw new Error(`AI recommendation error: ${error.message}`);
  }
};

/**
 * Fallback recommendation algorithm
 */
const getFallbackRecommendation = (providers) => {
  // Score = (rating * 0.4) + (experience * 0.2) + (1/distance * 0.3) + (completedJobs/100 * 0.1)
  const scoredProviders = providers.map(provider => {
    const distanceScore = provider.distance > 0 ? (1 / provider.distance) * 10 : 10;
    const score = 
      (provider.rating * 0.4) +
      (Math.min(provider.experience, 10) * 0.2) +
      (distanceScore * 0.3) +
      (Math.min(provider.completedJobs / 100, 1) * 0.1);

    return { ...provider, score };
  });

  // Sort by score descending
  scoredProviders.sort((a, b) => b.score - a.score);

  return {
    bestProvider: scoredProviders[0],
    alternatives: scoredProviders.slice(1, 4),
    algorithm: 'fallback'
  };
};

module.exports = { getAIRecommendation };