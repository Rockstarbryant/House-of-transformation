import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Edit, Users, BookOpen, Calendar, Newspaper, Image, Play, TrendingUp, ArrowRight } from 'lucide-react';
import Card from '../common/Card';
import { sermonService } from '../../services/api/sermonService';
import { eventService } from '../../services/api/eventService';

const AdminDashboard = () => {
  const [realStats, setRealStats] = useState({
    totalSermons: 0,
    totalEvents: 0,
    totalMembers: 0,
    newMembers: 0,
    activeMembers: 0,
    inactiveMembers: 0,
    adminCount: 0
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRealData = React.useCallback(async () => {
    try {
      setLoading(true);

      // Get real sermon count
      const sermonsData = await sermonService.getSermons();
      
      // Get real events count
      const eventsData = await eventService.getEvents();
      
      // Get real users data
      const usersResponse = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const usersData = await usersResponse.json();
      const users = usersData.users || [];

      const activeCount = users.filter(u => u.isActive).length;
      const inactiveCount = users.filter(u => !u.isActive).length;
      const adminCount = users.filter(u => u.role === 'admin').length;
      const recentUsersData = users
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setRealStats({
        totalSermons: sermonsData.sermons?.length || 0,
        totalEvents: eventsData.events?.length || 0,
        totalMembers: users.length,
        newMembers: users.filter(u => {
          const joinDate = new Date(u.createdAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return joinDate > thirtyDaysAgo;
        }).length,
        activeMembers: activeCount,
        inactiveMembers: inactiveCount,
        adminCount: adminCount
      });

      setRecentUsers(recentUsersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your church community and content</p>
        </div>
        <Link to="/" className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 font-semibold transition">
          ← Back to Site
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
          <BarChart size={28} /> Key Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-blue-900">
            <p className="text-gray-600 text-sm mb-2">Total Members</p>
            <p className="text-3xl font-bold text-blue-900">{realStats.totalMembers}</p>
            <p className="text-xs text-green-600 mt-2">+{realStats.newMembers} this month</p>
          </Card>

          <Card className="border-l-4 border-green-600">
            <p className="text-gray-600 text-sm mb-2">Active Members</p>
            <p className="text-3xl font-bold text-green-600">{realStats.activeMembers}</p>
            <p className="text-xs text-gray-500 mt-2">
              {realStats.totalMembers > 0 ? Math.round((realStats.activeMembers / realStats.totalMembers) * 100) : 0}% active
            </p>
          </Card>

          <Card className="border-l-4 border-purple-600">
            <p className="text-gray-600 text-sm mb-2">Admins</p>
            <p className="text-3xl font-bold text-purple-600">{realStats.adminCount}</p>
            <p className="text-xs text-gray-500 mt-2">Leadership team</p>
          </Card>

          <Card className="border-l-4 border-orange-600">
            <p className="text-gray-600 text-sm mb-2">Inactive</p>
            <p className="text-3xl font-bold text-orange-600">{realStats.inactiveMembers}</p>
            <p className="text-xs text-gray-500 mt-2">Need reactivation</p>
          </Card>
        </div>
      </div>

      {/* Content Stats */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-blue-900 mb-4">Content Library</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="text-center">
            <BookOpen className="mx-auto text-blue-900 mb-2" size={28} />
            <p className="text-gray-600 text-sm mb-1">Sermons</p>
            <p className="text-2xl font-bold text-blue-900">{realStats.totalSermons}</p>
          </Card>

          <Card className="text-center">
            <Calendar className="mx-auto text-blue-900 mb-2" size={28} />
            <p className="text-gray-600 text-sm mb-1">Events</p>
            <p className="text-2xl font-bold text-blue-900">{realStats.totalEvents}</p>
          </Card>

          <Card className="text-center">
            <Newspaper className="mx-auto text-blue-900 mb-2" size={28} />
            <p className="text-gray-600 text-sm mb-1">Blog Posts</p>
            <p className="text-2xl font-bold text-blue-900">-</p>
          </Card>
        </div>
      </div>

      {/* Main Management Sections */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* User Management */}
        <Card className="md:col-span-1">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <Users size={24} /> Member Management
            </h3>
            <Users className="text-blue-900" size={24} />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <span className="font-semibold text-gray-700">Total Members</span>
              <span className="font-bold text-blue-900 text-lg">{realStats.totalMembers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <span className="font-semibold text-gray-700">Active</span>
              <span className="font-bold text-green-600 text-lg">{realStats.activeMembers}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="font-semibold text-gray-700">Leadership</span>
              <span className="font-bold text-purple-600 text-lg">{realStats.adminCount}</span>
            </div>
            {realStats.inactiveMembers > 0 && (
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                <span className="font-semibold text-gray-700">Inactive</span>
                <span className="font-bold text-orange-600 text-lg">{realStats.inactiveMembers}</span>
              </div>
            )}
          </div>

          <Link to="/admin/users" className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 transition-colors block text-center flex items-center justify-center gap-2 group">
            Manage All Members
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </Card>

        {/* Content Management */}
        <Card className="md:col-span-1">
          <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center gap-2">
            <Edit size={24} /> Content Management
          </h3>
          <div className="space-y-2">
            <Link 
              to="/admin/sermons" 
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-50 to-transparent hover:from-blue-100 transition-colors flex items-center gap-3 group"
            >
              <BookOpen size={20} className="text-blue-900 group-hover:scale-110 transition-transform" />
              <span className="flex-grow font-semibold text-gray-800">Manage Sermons</span>
              <span className="text-sm font-bold text-blue-900 bg-white px-2 py-1 rounded">{realStats.totalSermons}</span>
            </Link>

            <Link 
              to="/admin/events" 
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-green-50 to-transparent hover:from-green-100 transition-colors flex items-center gap-3 group"
            >
              <Calendar size={20} className="text-green-600 group-hover:scale-110 transition-transform" />
              <span className="flex-grow font-semibold text-gray-800">Manage Events</span>
              <span className="text-sm font-bold text-green-600 bg-white px-2 py-1 rounded">{realStats.totalEvents}</span>
            </Link>

            <Link 
              to="/admin/blog" 
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-purple-50 to-transparent hover:from-purple-100 transition-colors flex items-center gap-3 group"
            >
              <Newspaper size={20} className="text-purple-600 group-hover:scale-110 transition-transform" />
              <span className="flex-grow font-semibold text-gray-800">Manage Blog Posts</span>
              <span className="text-sm font-bold text-purple-600 bg-white px-2 py-1 rounded">-</span>
            </Link>

            <Link 
              to="/admin/gallery" 
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-yellow-50 to-transparent hover:from-yellow-100 transition-colors flex items-center gap-3 group"
            >
              <Image size={20} className="text-yellow-600 group-hover:scale-110 transition-transform" />
              <span className="flex-grow font-semibold text-gray-800">Manage Gallery</span>
              <span className="text-sm font-bold text-yellow-600 bg-white px-2 py-1 rounded">-</span>
            </Link>

            <Link 
              to="/admin/livestream" 
              className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-red-50 to-transparent hover:from-red-100 transition-colors flex items-center gap-3 group"
            >
              <Play size={20} className="text-red-600 group-hover:scale-110 transition-transform" />
              <span className="flex-grow font-semibold text-gray-800">Manage Live Stream</span>
              <span className="text-sm font-bold text-red-600 bg-white px-2 py-1 rounded">Live</span>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Members */}
      {recentUsers.length > 0 && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <TrendingUp size={24} /> Recently Joined Members
            </h3>
            <Link to="/admin/users" className="text-blue-900 hover:underline font-semibold text-sm">
              View All →
            </Link>
          </div>

          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4 flex-grow">
                  <div className="w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      user.role === 'pastor' ? 'bg-red-100 text-red-800' :
                      user.role === 'volunteer' ? 'bg-indigo-100 text-indigo-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role.replace('_', ' ').toUpperCase()}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Joined {formatDate(user.createdAt)}</p>
                  </div>
                  <Link
                    to={`/profile/${user._id}`}
                    className="p-2 text-blue-900 hover:bg-blue-100 rounded-lg transition"
                    title="View profile"
                  >
                    <Users size={20} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;