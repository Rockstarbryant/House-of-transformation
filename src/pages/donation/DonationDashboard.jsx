// ============================================
// FILE 23: pages/DonationDashboard.jsx (Member)
// ============================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, TrendingUp, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import axios from 'axios';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';

const API_URL = process.env.REACT_APP_DONATION_API_URL || 'http://localhost:5001/api';

const DonationDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pledges, setPledges] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const dashboardRes = await axios.get(`${API_URL}/dashboard/member`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (dashboardRes.data.success) {
        setStats(dashboardRes.data.stats);
        setPledges(dashboardRes.data.pledges);
        setCampaigns(dashboardRes.data.activeCampaigns);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Page Title */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-blue-900 flex items-center gap-3 mb-2">
            <Heart className="text-red-600" size={40} />
            My Giving Dashboard
          </h1>
          <p className="text-gray-600">Track your pledges and contributions</p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card>
              <p className="text-gray-600 text-sm mb-1">Total Pledged</p>
              <p className="text-3xl font-bold text-blue-900">
                KES {stats.totalPledged?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.activeCampaigns} campaigns
              </p>
            </Card>

            <Card>
              <p className="text-gray-600 text-sm mb-1">Total Paid</p>
              <p className="text-3xl font-bold text-green-600">
                KES {stats.totalPaid?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {Math.round((stats.totalPaid / (stats.totalPledged || 1)) * 100)}% completed
              </p>
            </Card>

            <Card>
              <p className="text-gray-600 text-sm mb-1">Remaining</p>
              <p className="text-3xl font-bold text-orange-600">
                KES {stats.totalRemaining?.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                To be paid
              </p>
            </Card>

            <Card>
              <p className="text-gray-600 text-sm mb-1">Completed Pledges</p>
              <p className="text-3xl font-bold text-purple-600">
                {stats.completedPledges}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.pendingPledges} pending
              </p>
            </Card>
          </div>
        )}

        {/* Pledges Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-blue-900 mb-6">Your Pledges</h2>

          {pledges.length === 0 ? (
            <Card className="text-center p-12">
              <Heart className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-500 text-lg mb-6">No pledges yet</p>
              <Link
                to="/donations"
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Explore Campaigns
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {pledges.map(pledge => {
                const progress = (pledge.paidAmount / pledge.pledgedAmount) * 100;
                const daysLeft = Math.ceil((new Date(pledge.campaignId.endDate) - new Date()) / (1000 * 60 * 60 * 24));

                return (
                  <Card key={pledge._id} className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      
                      {/* Left Section */}
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {pledge.campaignId.name}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(pledge.status)}`}>
                            {pledge.status.charAt(0).toUpperCase() + pledge.status.slice(1)}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-gray-500">Pledged</p>
                            <p className="font-bold text-gray-900">
                              KES {pledge.pledgedAmount?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Paid</p>
                            <p className="font-bold text-green-600">
                              KES {pledge.paidAmount?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Remaining</p>
                            <p className="font-bold text-orange-600">
                              KES {pledge.remainingAmount?.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Days Left</p>
                            <p className="font-bold text-blue-600">{daysLeft}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-600">
                            {Math.round(progress)}% paid
                          </p>
                        </div>
                      </div>

                      {/* Right Section - Actions */}
                      <div className="flex flex-col gap-2">
                        {pledge.remainingAmount > 0 && (
                          <Link
                            to={`/donations/pay/${pledge._id}`}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition text-center"
                          >
                            Make Payment
                          </Link>
                        )}
                        <button
                          className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Receipt
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        {campaigns.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-6">Other Active Campaigns</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.slice(0, 3).map(campaign => {
                const progress = (campaign.totalRaised / campaign.goalAmount) * 100;
                return (
                  <Card key={campaign._id}>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{campaign.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-gray-700">Progress</span>
                        <span className="text-gray-600">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      to={`/donations/pledge/${campaign._id}`}
                      className="w-full block text-center bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                    >
                      Make Pledge
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DonationDashboard;