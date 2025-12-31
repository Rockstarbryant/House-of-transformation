import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const galleryService = {
  async getPhotos(params = {}) {
    try {
      const response = await api.get(API_ENDPOINTS.GALLERY.LIST, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async uploadPhoto(formData) {
    try {
      // Make sure it's actually FormData with the file
      const response = await api.post(API_ENDPOINTS.GALLERY.UPLOAD, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  },

  async deletePhoto(id) {
    try {
      const response = await api.delete(API_ENDPOINTS.GALLERY.DELETE(id));
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async likePhoto(id) {
    try {
      const response = await api.post(`/gallery/${id}/like`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};