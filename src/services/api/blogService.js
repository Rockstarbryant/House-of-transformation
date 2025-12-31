import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const blogService = {
  async getPosts(params = {}) {
    try {
      const { page = 1, limit = 12, category } = params;
      const queryParams = new URLSearchParams({ page, limit, ...(category && { category }) });
      const response = await api.get(`${API_ENDPOINTS.BLOG.LIST}?${queryParams}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getPost(id) {
    try {
      const response = await api.get(API_ENDPOINTS.BLOG.GET(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async createPost(postData) {
    try {
      const response = await api.post(API_ENDPOINTS.BLOG.CREATE, postData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async deletePost(id) {
  try {
    const response = await api.delete(API_ENDPOINTS.BLOG.DELETE(id));
    return response.data;
  } catch (error) {
    throw error;
  }
}
};