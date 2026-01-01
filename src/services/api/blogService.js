import api from './authService';

const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;
  try {
    const parsed = JSON.parse(token);
    return parsed.value || token;
  } catch (e) {
    return token;
  }
};

export const blogService = {
  async getBlogs() {
    try {
      const response = await fetch('http://localhost:5000/api/blogs', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
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
      const response = await fetch(`http://localhost:5000/api/blogs/category/${category}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
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
      const response = await fetch(`http://localhost:5000/api/blogs/${id}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
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
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('http://localhost:5000/api/blogs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`http://localhost:5000/api/blogs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`http://localhost:5000/api/blogs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`http://localhost:5000/api/blogs/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
      const token = getAuthToken();
      if (!token) throw new Error('Not authenticated');

      const response = await fetch('http://localhost:5000/api/blogs/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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