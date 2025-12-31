import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const donationService = {
  async initiate(donationData) {
    try {
      const response = await api.post(API_ENDPOINTS.DONATIONS.INITIATE, donationData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async verify(transactionId) {
    try {
      const response = await api.post(API_ENDPOINTS.DONATIONS.VERIFY, { transactionId });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  async getHistory() {
    try {
      const response = await api.get(API_ENDPOINTS.DONATIONS.HISTORY);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};