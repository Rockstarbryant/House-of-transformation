import React from 'react';
import Card from '../common/Card';

const VolunteerProfile = ({ profile }) => {
  return (
    <div className="bg-blue-50 rounded-xl p-8">
      <h3 className="text-2xl font-bold text-blue-900 mb-6 text-center">Your Volunteer Profile</h3>
      <div className="grid md:grid-cols-3 gap-6">
        <Card padding="lg" className="text-center">
          <p className="text-4xl mb-2">⏰</p>
          <p className="font-bold text-blue-900 text-2xl">{profile?.hours || 0} Hours</p>
          <p className="text-sm text-gray-600">This Year</p>
        </Card>
        <Card padding="lg" className="text-center">
          <p className="text-4xl mb-2">🎯</p>
          <p className="font-bold text-blue-900 text-2xl">{profile?.ministries || 0} Ministries</p>
          <p className="text-sm text-gray-600">Active In</p>
        </Card>
        <Card padding="lg" className="text-center">
          <p className="text-4xl mb-2">⭐</p>
          <p className="font-bold text-blue-900 text-2xl">{profile?.level || 'Starter'}</p>
          <p className="text-sm text-gray-600">Impact Level</p>
        </Card>
      </div>
    </div>
  );
};

export default VolunteerProfile;