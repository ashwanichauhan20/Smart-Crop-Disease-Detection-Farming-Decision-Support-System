const isProduction = import.meta.env.MODE === 'production';
export const API_BASE = import.meta.env.VITE_API_BASE || (isProduction ? '' : 'http://localhost:5001');

// For Mandi API specifically
export const MANDI_API = isProduction ? '/api/mandis' : 'http://localhost:5001/api/mandis';
