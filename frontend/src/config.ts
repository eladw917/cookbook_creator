// Frontend configuration
const config = {
  // API base URL - defaults to localhost:8000 for development
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
};

export default config;
