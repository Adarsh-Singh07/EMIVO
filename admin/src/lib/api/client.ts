import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config: any) => {
  // In a real app we attach the JWT Bearer here
  // config.headers.Authorization = Bearer 
  return config;
});

export default api;
