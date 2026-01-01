import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const tokenData = typeof token === 'string' ? 
          (token.startsWith('{') ? JSON.parse(token) : { value: token }) : 
          token;
        
        const response = await authService.verifyToken(tokenData.value || tokenData);
        if (response.user) {
          setUser(response.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('authToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.token) {
        localStorage.setItem('authToken', JSON.stringify({ 
          value: response.token,
          expiry: new Date().getTime() + 7 * 24 * 60 * 60 * 1000
        }));
        setUser(response.user);
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authService.signup(userData);
      if (response.token) {
        localStorage.setItem('authToken', JSON.stringify({ 
          value: response.token,
          expiry: new Date().getTime() + 7 * 24 * 60 * 60 * 1000
        }));
        setUser(response.user);
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Signup failed' };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  // Permission methods
  const canPostBlog = () => {
    return user && ['member', 'volunteer', 'usher', 'worship_team', 'pastor', 'bishop', 'admin'].includes(user.role);
  };

  const canPostBlogCategory = (category) => {
    if (!user) return false;
    const permissions = {
      member: ['testimonies'],
      volunteer: ['testimonies', 'events'],
      usher: ['testimonies', 'events'],
      worship_team: ['testimonies', 'events'],
      pastor: ['testimonies', 'events', 'teaching', 'news'],
      bishop: ['testimonies', 'events', 'teaching', 'news'],
      admin: ['testimonies', 'events', 'teaching', 'news']
    };
    return (permissions[user.role] || []).includes(category);
  };

  const getAllowedBlogCategories = () => {
    if (!user) return [];
    const permissions = {
      member: ['testimonies'],
      volunteer: ['testimonies', 'events'],
      usher: ['testimonies', 'events'],
      worship_team: ['testimonies', 'events'],
      pastor: ['testimonies', 'events', 'teaching', 'news'],
      bishop: ['testimonies', 'events', 'teaching', 'news'],
      admin: ['testimonies', 'events', 'teaching', 'news']
    };
    return permissions[user.role] || [];
  };

  const canPostSermon = () => {
    return user && ['pastor', 'bishop', 'admin'].includes(user.role);
  };

  const canUploadPhoto = () => {
    return user && ['pastor', 'bishop', 'admin'].includes(user.role);
  };

  const canEditBlog = (authorId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.id === authorId;
  };

  const canDeleteBlog = (authorId) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.id === authorId;
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const value = {
    user,
    isLoading,
    login,
    signup,
    logout,
    canPostBlog,
    canPostBlogCategory,
    getAllowedBlogCategories,
    canPostSermon,
    canUploadPhoto,
    canEditBlog,
    canDeleteBlog,
    isAdmin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
};