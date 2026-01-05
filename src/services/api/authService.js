// src/services/api/authService.js
import axios from 'axios';
import { tokenService } from './../tokenService';
import { API_ENDPOINTS } from '../../utils/constants';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = tokenService.getToken();
    if (token) {
      // Token is already a raw string from tokenService
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle rate limiting
    if (error.response?.status === 429) {
      console.warn('Rate limited - too many requests');
      return Promise.reject(error);
    }

    // Handle unauthorized (401)
    if (error.response?.status === 401) {
      console.warn('Unauthorized - clearing token and redirecting to login');
      tokenService.removeToken();
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  async login(email, password) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.LOGIN, {
        email,
        password
      });

      if (response.data.token) {
        // Store raw token string
        tokenService.setToken(response.data.token);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async signup(userData) {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.SIGNUP, userData);

      if (response.data.token) {
        // Store raw token string
        tokenService.setToken(response.data.token);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async logout() {
    try {
      await api.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      tokenService.removeToken();
    }
  },

  async verifyToken(token) {
    try {
      const response = await api.get(API_ENDPOINTS.AUTH.VERIFY, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async refreshToken() {
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.REFRESH);
      if (response.data.token) {
        tokenService.setToken(response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async updateProfile(updates) {
    try {
      const response = await api.put('/auth/profile', updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async resetPassword(token, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api;