import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Edit, Users, BookOpen, Calendar, Newspaper, Image, Play, Eye } from 'lucide-react';
import Card from '../common/Card';
import { analyticsService } from '../../services/api/analyticsService';
import { sermonService } from '../../services/api/sermonService';
import { eventService } from '../../services/api/eventService';

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
    donations: 0,
    sermonViews: 0,
    avgSessionTime: '0m 0s',
    eventRegistrations: 0
  });

  const [realStats, setRealStats] = useState({
    totalSermons: 0,
    totalEvents: 0,
    totalMembers: 0,
    newMembers: 0
  });

  useEffect(() => {
    fetchRealData();
  }, []);

  const fetchRealData = async () => {
    try {
      // Get real sermon count
      const sermonsData = await sermonService.getSermons();
      
      // Get real events count
      const eventsData = await eventService.getEvents();
      
      // Get real analytics if available
      try {
        const analyticsData = await analyticsService.getOverview();
        setAnalytics(analyticsData);
      } catch (err) {
        console.log('Analytics not available yet');
      }

      setRealStats({
        totalSermons: sermonsData.sermons?.length || 0,
        totalEvents: eventsData.events?.length || 0,
        totalMembers: 342, // Will be dynamic when we add user management
        newMembers: 23
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900">Admin Dashboard</h1>
        <Link to="/" className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300">
          Back to Site
        </Link>
      </div>

      {/* Analytics Overview */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
          <BarChart size={28} /> Analytics Overview
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">Total Sermons</p>
              <BookOpen className="text-blue-900" size={24} />
            </div>
            <p className="text-3xl font-bold text-blue-900">{realStats.totalSermons}</p>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">Total Events</p>
              <Calendar className="text-blue-900" size={24} />
            </div>
            <p className="text-3xl font-bold text-blue-900">{realStats.totalEvents}</p>
          </Card>
          
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">Total Members</p>
              <Users className="text-blue-900" size={24} />
            </div>
            <p className="text-3xl font-bold text-blue-900">{realStats.totalMembers}</p>
            <p className="text-sm text-green-600 mt-2">+{realStats.newMembers} this month</p>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Edit size={24} /> Content Management
          </h3>
          <div className="space-y-3">
            <Link to="/admin/sermons" className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors flex items-center gap-3 block">
              <BookOpen size={20} className="text-blue-900" />
              <span>Manage Sermons ({realStats.totalSermons})</span>
            </Link>
            <Link to="/admin/events" className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors flex items-center gap-3 block">
              <Calendar size={20} className="text-blue-900" />
              <span>Manage Events ({realStats.totalEvents})</span>
            </Link>
            <Link to="/admin/blog" className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors flex items-center gap-3 block">
              <Newspaper size={20} className="text-blue-900" />
              <span>Manage Blog Posts</span>
            </Link>
            <Link to="/admin/gallery" className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors flex items-center gap-3 block">
              <Image size={20} className="text-blue-900" />
              <span>Manage Gallery</span>
            </Link>
            <Link to="/admin/livestream" className="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors flex items-center gap-3 block">
              <Play size={20} className="text-red-600" />
              <span>Manage Live Stream</span>
            </Link>
          </div>
        </Card>

        <Card>
          <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Users size={24} /> User Management
          </h3>
          <div className="space-y-3">
            <div className="px-4 py-3 rounded-lg bg-gray-50 flex justify-between items-center">
              <span>Total Members</span>
              <span className="font-bold text-blue-900">{realStats.totalMembers}</span>
            </div>
            <div className="px-4 py-3 rounded-lg bg-gray-50 flex justify-between items-center">
              <span>New This Month</span>
              <span className="font-bold text-green-600">+{realStats.newMembers}</span>
            </div>
            <Link to="/admin/users" className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors block text-center">
              View All Members
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;