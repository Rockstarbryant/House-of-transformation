// ============================================
// FILE 21: pages/DonationPage.jsx - COMPLETE
// ============================================
import React, { useState, useEffect } from 'react';
import { Heart, TrendingUp, Users, Target, Filter } from 'lucide-react';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import CampaignCard from '../../components/donation/CampaignCard';
import CampaignFilter from '../../components/donation/CampaignFilter';
import DonationStats from '../../components/donation/DonationStats';
import { useDonation } from '../../context/DonationContext';

const DonationPage = () => {
  const { campaigns, dashboardStats, loading, fetchActiveCampaigns, fetchAdminDashboard } = useDonation();
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'active',
    type: '',
    sortBy: 'newest'
  });

  useEffect(() => {
    // Fetch campaigns with active status
    fetchActiveCampaigns();
    // Fetch stats for display
    fetchAdminDashboard();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [campaigns, searchTerm, filters]);

  const applyFiltersAndSearch = () => {
    let filtered = campaigns || [];

    // Filter by status (already fetching active, but support for other statuses)
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(c => c.type === filters.type);
    }

    // Search by name or description
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'most-raised':
          return b.totalRaised - a.totalRaised;
        case 'least-raised':
          return a.totalRaised - b.totalRaised;
        case 'ending-soon':
          return new Date(a.endDate) - new Date(b.endDate);
        case 'progress':
          return (b.totalRaised / b.goalAmount) - (a.totalRaised / a.goalAmount);
        case 'newest':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    setFilteredCampaigns(filtered);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  if (loading) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="text-red-600 animate-pulse" size={48} />
            <h1 className="text-5xl font-bold text-blue-900">Give with Purpose</h1>
          </div>
          <p className="text-xl text-gray-700 mb-2">
            Support our mission to transform lives and communities
          </p>
          <p className="text-lg text-green-600 font-semibold">
            ✓ Secure Payments • Transparent Tracking • Your Impact Matters
          </p>
        </div>

        {/* Statistics */}
        {dashboardStats && (
          <div className="mb-16">
            <DonationStats 
              stats={dashboardStats} 
              variant="admin"
              loading={loading}
            />
          </div>
        )}

        {/* Campaigns Section */}
        <div className="mb-16">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-blue-900 mb-4 text-center flex items-center justify-center gap-3">
              <Filter size={32} />
              Active Campaigns
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Browse our current campaigns and find one that touches your heart
            </p>
          </div>

          {/* Filter Component */}
          <CampaignFilter 
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            campaigns={campaigns}
          />

          {/* Campaigns Grid */}
          {filteredCampaigns.length === 0 ? (
            <Card className="text-center p-12">
              <Heart className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-500 text-lg mb-4">
                {searchTerm ? 'No campaigns match your search' : 'No active campaigns at the moment'}
              </p>
              <p className="text-gray-400 text-sm">
                Check back soon for new opportunities to make a difference
              </p>
            </Card>
          ) : (
            <>
              <div className="mb-6 text-sm text-gray-600">
                Showing <span className="font-bold text-blue-900">{filteredCampaigns.length}</span> of <span className="font-bold text-blue-900">{campaigns.length}</span> campaigns
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map(campaign => (
                  <CampaignCard 
                    key={campaign._id} 
                    campaign={campaign}
                    onPledge={() => {
                      // Handled by CampaignCard link to /donations/pledge/:id
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* How It Works Section */}
        <Card className="p-8 md:p-12 bg-white">
          <h2 className="text-3xl font-bold text-blue-900 mb-8 text-center">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                num: '1', 
                title: 'Choose Campaign', 
                desc: 'Select a campaign that touches your heart',
                icon: '🎯'
              },
              { 
                num: '2', 
                title: 'Make Pledge', 
                desc: 'Commit the amount you want to give',
                icon: '💝'
              },
              { 
                num: '3', 
                title: 'Pay Via M-Pesa', 
                desc: 'Secure payment through M-Pesa',
                icon: '📱'
              },
              { 
                num: '4', 
                title: 'See Impact', 
                desc: 'Track progress and impact in real-time',
                icon: '📊'
              }
            ].map((step, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl mb-3">{step.icon}</div>
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">
                  {step.num}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Ready to Make a Difference?</h3>
          <p className="text-blue-100 mb-6">
            Every contribution, no matter the size, brings us closer to our mission
          </p>
          {filteredCampaigns.length > 0 && (
            <p className="text-sm text-blue-200">
              Explore the {filteredCampaigns.length} active campaign{filteredCampaigns.length !== 1 ? 's' : ''} above to get started
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonationPage;