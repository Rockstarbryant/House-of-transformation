import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const volunteerService = {
  async getOpportunities() {
    try {
      const response = await api.get(API_ENDPOINTS.VOLUNTEERS.OPPORTUNITIES);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async apply(applicationData) {
    try {
      const response = await api.post(API_ENDPOINTS.VOLUNTEERS.APPLY, applicationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getProfile() {
    try {
      const response = await api.get(API_ENDPOINTS.VOLUNTEERS.PROFILE);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};