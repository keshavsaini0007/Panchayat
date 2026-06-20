import axios from 'axios';

const GEOAPIFY_BASE = 'https://api.geoapify.com/v1/geocode/reverse';
let pendingRequest = null;

function getApiKey() {
  const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key) {
    throw new Error('Geoapify API key is not configured. Add VITE_GEOAPIFY_API_KEY to your .env file.');
  }
  return key;
}

export async function reverseGeocode(lat, lng) {
  const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;

  if (pendingRequest?.key === cacheKey) {
    return pendingRequest.promise;
  }

  const promise = (async () => {
    try {
      const apiKey = getApiKey();
      const res = await axios.get(GEOAPIFY_BASE, {
        params: {
          lat,
          lon: lng,
          apiKey,
          lang: 'en',
          format: 'json',
        },
        timeout: 8000,
      });

      const features = res.data?.results;
      if (!features || features.length === 0) {
        return { address: '', plusCode: '' };
      }

      const result = features[0];
      return {
        address: result.formatted || '',
        plusCode: result.plus_code || result.plus_code_short || '',
      };
    } catch (err) {
      if (err.code === 'ECONNABORTED') {
        return { address: '', plusCode: '', error: 'Request timed out. Please try again.' };
      }
      if (err.response?.status === 401) {
        return { address: '', plusCode: '', error: 'Invalid Geoapify API key.' };
      }
      if (err.response?.status === 429) {
        return { address: '', plusCode: '', error: 'Too many requests. Please wait a moment.' };
      }
      return { address: '', plusCode: '', error: 'Failed to fetch address. Check your connection.' };
    }
  })();

  pendingRequest = { key: cacheKey, promise };
  promise.finally(() => {
    if (pendingRequest?.key === cacheKey) {
      pendingRequest = null;
    }
  });

  return promise;
}
