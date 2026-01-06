import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const sermonService = {
  async getSermons(params = {}) {
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
  },

  async getSermon(id) {
    const response = await api.get(API_ENDPOINTS.SERMONS.GET(id));
    return response.data;
  },

  /**
   * Create sermon with optional file upload
   * If file is selected, sends FormData with thumbnail file
   * Otherwise sends JSON data with thumbnail URL
   */
  async createSermon(sermonData) {
    try {
      // If thumbnail is a File object (from input), use FormData
      if (sermonData.thumbnail instanceof File) {
        const formData = new FormData();
        formData.append('title', sermonData.title);
        formData.append('pastor', sermonData.pastor);
        formData.append('date', sermonData.date);
        formData.append('category', sermonData.category);
        formData.append('description', sermonData.description);
        formData.append('type', sermonData.type);
        formData.append('thumbnail', sermonData.thumbnail);
        if (sermonData.videoUrl) {
          formData.append('videoUrl', sermonData.videoUrl);
        }

        const response = await api.post(API_ENDPOINTS.SERMONS.CREATE, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
      } else {
        // Send as JSON if thumbnail is URL or not provided
        const response = await api.post(API_ENDPOINTS.SERMONS.CREATE, sermonData);
        return response.data;
      }
    } catch (error) {
      console.error('Create sermon error:', error);
      throw error;
    }
  },

  /**
   * Update sermon with optional file upload
   */
  async updateSermon(id, updates) {
    try {
      if (updates.thumbnail instanceof File) {
        const formData = new FormData();
        Object.keys(updates).forEach(key => {
          if (key === 'thumbnail') {
            formData.append('thumbnail', updates[key]);
          } else if (updates[key] !== null && updates[key] !== undefined) {
            formData.append(key, updates[key]);
          }
        });

        const response = await api.put(API_ENDPOINTS.SERMONS.UPDATE(id), formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
      } else {
        const response = await api.put(API_ENDPOINTS.SERMONS.UPDATE(id), updates);
        return response.data;
      }
    } catch (error) {
      console.error('Update sermon error:', error);
      throw error;
    }
  },

  async deleteSermon(id) {
    const response = await api.delete(API_ENDPOINTS.SERMONS.DELETE(id));
    return response.data;
  },

  async toggleLike(id) {
    const response = await api.post(`/sermons/${id}/like`);
    return response.data;
  },

  async getFeaturedSermons(limit = 3) {
    const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?featured=true&limit=${limit}`);
    return response.data;
  },

  async getSermonsByPastor(pastorId) {
    const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?pastor=${pastorId}`);
    return response.data;
  },

  async getSermonsByType(type) {
    const response = await api.get(`${API_ENDPOINTS.SERMONS.LIST}?type=${type}`);
    return response.data;
  }
};