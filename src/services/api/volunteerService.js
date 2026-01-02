import api from './authService';
import { API_ENDPOINTS } from '../../utils/constants';

export const volunteerService = {
  // Get all volunteer opportunities
  async getOpportunities() {
    try {
      const response = await api.get(API_ENDPOINTS.VOLUNTEERS.OPPORTUNITIES);
      return response.data;
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      throw error;
    }
  },

  // Submit volunteer application
  async apply(applicationData) {
    try {
      const response = await api.post(API_ENDPOINTS.VOLUNTEERS.APPLY, applicationData);
      return response.data;
    } catch (error) {
      console.error('Error submitting application:', error);
      throw error;
    }
  },

  // Get current user's volunteer profile
  async getProfile() {
    try {
      const response = await api.get(API_ENDPOINTS.VOLUNTEERS.PROFILE);
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  // Get current user's applications
  async getMyApplications() {
    try {
      const response = await api.get('/volunteers/my-applications');
      return response.data;
    } catch (error) {
      console.error('Error fetching applications:', error);
      throw error;
    }
  },

  // Admin: Get all volunteer applications
  async getAllApplications(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.ministry) params.append('ministry', filters.ministry);
      
      const response = await api.get(`/volunteers/applications?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all applications:', error);
      throw error;
    }
  },

  // Admin: Update application status
  async updateStatus(applicationId, statusData) {
    try {
      const response = await api.put(`/volunteers/${applicationId}`, statusData);
      return response.data;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  },

  // Admin: Update volunteer hours
  async updateHours(applicationId, hours) {
    try {
      const response = await api.put(`/volunteers/${applicationId}/hours`, { hours });
      return response.data;
    } catch (error) {
      console.error('Error updating hours:', error);
      throw error;
    }
  },

  // Admin: Delete application
  async deleteApplication(applicationId) {
    try {
      const response = await api.delete(`/volunteers/${applicationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting application:', error);
      throw error;
    }
  },

  // Admin: Get volunteer statistics
  async getStats() {
    try {
      const response = await api.get('/volunteers/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }
};