import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add optional auth token if available
// Add optional auth token if available
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const feedbackService = {
  // Submit feedback (NO AUTH REQUIRED - works for anonymous and authenticated users)
  async submitFeedback(feedbackData) {
  try {
    const response = await api.post('/feedback', feedbackData);
    return response.data;
  } catch (error) {
    console.error('Submit feedback error:', error);
    throw error;
  }
},

  // Get public testimonies (NO AUTH REQUIRED)
  async getPublicTestimonies() {
    try {
      const response = await axios.get(`${API_URL}/feedback/testimonies/public`);
      return response.data;
    } catch (error) {
      console.error('Get testimonies error:', error);
      throw error;
    }
  },

  // Admin: Get all feedback
  async getAllFeedback(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.anonymous) params.append('anonymous', filters.anonymous);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/feedback?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  },

  // Admin: Get single feedback
  async getFeedback(id) {
    try {
      const response = await api.get(`/feedback/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get feedback error:', error);
      throw error;
    }
  },

  // Admin: Update feedback status
  async updateStatus(id, statusData) {
    try {
      const response = await api.put(`/feedback/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      console.error('Update status error:', error);
      throw error;
    }
  },

  // Admin: Respond to feedback
  async respondToFeedback(id, response) {
    try {
      const result = await api.post(`/feedback/${id}/respond`, { response });
      return result.data;
    } catch (error) {
      console.error('Respond error:', error);
      throw error;
    }
  },

  // Admin: Publish testimony
  async publishTestimony(id) {
    try {
      const response = await api.put(`/feedback/${id}/publish`);
      return response.data;
    } catch (error) {
      console.error('Publish testimony error:', error);
      throw error;
    }
  },

  // Admin: Delete feedback
  async deleteFeedback(id) {
    try {
      const response = await api.delete(`/feedback/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete feedback error:', error);
      throw error;
    }
  },

  // Admin: Get statistics
  async getStats() {
    try {
      const response = await api.get('/feedback/stats');
      return response.data;
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  }
};