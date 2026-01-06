import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const sermonService = {
  /**
   * Get all sermons with pagination, filters, and search
   */
  async getSermons(params = {}) {
    try {
      const { 
        page = 1, 
        limit = 12, 
        category, 
        search, 
        type,
        sortBy = 'date' 
      } = params;

      const queryParams = new URLSearchParams({
        page,
        limit,
        sortBy,
        ...(category && { category }),
        ...(search && { search }),
        ...(type && { type })
      });

      const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single sermon by ID
   */
  async getSermon(id) {
    try {
      const response = await api.get(API_ENDPOINTS.SERMONS.GET(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new sermon (admin only)
   */
  async createSermon(sermonData) {
    try {
      const response = await api.post(API_ENDPOINTS.SERMONS.CREATE, sermonData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update sermon (admin only)
   */
  async updateSermon(id, updates) {
    try {
      const response = await api.put(API_ENDPOINTS.SERMONS.UPDATE(id), updates);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete sermon (admin only)
   */
  async deleteSermon(id) {
    try {
      const response = await api.delete(API_ENDPOINTS.SERMONS.DELETE(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Like/unlike sermon
   */
  async toggleLike(id) {
    try {
      const response = await api.post(`/sermons/${id}/like`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get featured sermons
   */
  async getFeaturedSermons(limit = 3) {
    try {
      const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?featured=true&limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get sermons by pastor
   */
  async getSermonsByPastor(pastorId) {
    try {
      const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?pastor=${pastorId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get sermons by type
   */
  async getSermonsByType(type) {
    try {
      const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?type=${type}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};