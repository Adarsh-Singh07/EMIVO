import axios from 'axios';
import Cookies from 'js-cookie';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const setTokens = (accessToken: string, refreshToken: string) => {
  Cookies.set('auth_token', accessToken, { secure: true, sameSite: 'strict', expires: 7 }); 
  Cookies.set('refresh_token', refreshToken, { secure: true, sameSite: 'strict', expires: 30 }); 
};

export const removeTokens = () => {
  Cookies.remove('auth_token');
  Cookies.remove('refresh_token');
};

export default apiClient;
