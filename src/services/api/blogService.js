import api from './authService';

export const blogService = {
  async getBlogs() {
    try {
      const response = await api.get('/blogs', {
       
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch blogs');
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getBlogsByCategory(category) {
    try {
      const response = await fetch(`https://house-of-transformation.onrender.com/api/blogs/category/${category}`, {
       
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch blogs');
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getBlog(id) {
    try {
      const response = await api.get(`/blogs/${id}`, {
        
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch blog');
      return data;
    } catch (error) {
      throw error;
    }
  },

  async createBlog(blogData) {
    try {
      const response = await api.post('/blogs', {
        method: 'POST',
       
        body: JSON.stringify(blogData)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create blog');
      }
      return data;
    } catch (error) {
      throw error;
    }
  },

  async updateBlog(id, blogData) {
    try {
     const response = await api.put(`/blogs/${id}`, {
        method: 'PUT',
        
        body: JSON.stringify(blogData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update blog');
      return data;
    } catch (error) {
      throw error;
    }
  },

  async deleteBlog(id) {
    try {
       const response = await api.delete(`/blogs/${id}`, {
        method: 'DELETE',
        
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete blog');
      return data;
    } catch (error) {
      throw error;
    }
  },

  async approveBlog(id) {
    try {
      const response = await api.get(`/blogs/${id}/approve`, {
        method: 'PUT',
        
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to approve blog');
      return data;
    } catch (error) {
      throw error;
    }
  },

  async getPendingBlogs() {
    try {
       const response = await api.get('/blogs/pending', {
        
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch pending blogs');
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Legacy method for compatibility
  async getPosts() {
    return this.getBlogs();
  },

  async createBlogPost(blogData) {
    return this.createBlog(blogData);
  },

  async deletePost(id) {
    return this.deleteBlog(id);
  }
};