// src/pages/VolunteerPage.jsx
import React from 'react';
import { UserPlus } from 'lucide-react';
import OpportunityCard from '../components/volunteer/OpportunityCard';
import VolunteerProfile from '../components/volunteer/VolunteerProfile';
import { useAuthContext } from '../context/AuthContext';
import { volunteerData } from '../data/volunteers';

const VolunteerPage = () => {
  const { user } = useAuthContext();

  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-blue-900 mb-4 flex items-center justify-center gap-3">
            <UserPlus size={48} /> Volunteer Portal
          </h1>
          <p className="text-xl text-gray-600">Use your gifts to serve and make a difference</p>
        </div>

        <div className="bg-gradient-to-r from-blue-900 to-purple-900 text-white rounded-2xl p-8 mb-12 text-center">
          <h3 className="text-3xl font-bold mb-4">Why Volunteer?</h3>
          <p className="text-lg mb-6">Use your God-given talents to transform lives and grow in faith</p>
        </div>

        <div className="space-y-6 mb-12">
          {volunteerData.map(opp => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>

        {user && <VolunteerProfile profile={{ hours: 32, ministries: 3, level: 'Champion' }} />}
      </div>
    </div>
  );
};

export default VolunteerPage;