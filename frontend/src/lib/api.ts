import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const user = useAuthStore.getState().user;
    
    if (user?.email) {
      config.headers['x-user-email'] = user.email;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error("🚨 Brecha de seguridad o sesión expirada. El backend rechazó la petición.");
    }
    return Promise.reject(error);
  }
);

export default api;