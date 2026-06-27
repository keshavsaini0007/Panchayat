const REQUIRED_VARS = [
  { key: 'VITE_API_URL', name: 'API URL', defaultValue: 'http://localhost:5000/api' },
  { key: 'VITE_GEOAPIFY_API_KEY', name: 'Geoapify API Key', defaultValue: '' },
];

export function validateEnvironment() {
  const missing = [];
  for (const { key, name, defaultValue } of REQUIRED_VARS) {
    const value = import.meta.env[key];
    if (!value && !defaultValue) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    console.warn(`Missing environment variables: ${missing.join(', ')}. Some features may not work.`);
  }
  return missing.length === 0;
}
