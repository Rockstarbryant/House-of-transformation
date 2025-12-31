import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Calendar, Award } from 'lucide-react';
import Card from '../components/common/Card';

const UserProfilePage = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`);
      const data = await response.json();
      setProfile(data.user);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (!profile) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="pt-20 pb-20 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <Card>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 bg-blue-900 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-blue-900">{profile.name}</h1>
              <p className="text-gray-600 capitalize">{profile.role.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="flex items-center gap-3">
              <Mail className="text-blue-900" size={20} />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-blue-900" size={20} />
              <span>{profile.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="text-blue-900" size={20} />
              <span>{profile.location || 'Busia County, Kenya'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-blue-900" size={20} />
              <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-2xl font-bold text-blue-900 mb-4">Ministry Involvement</h2>
            <div className="flex flex-wrap gap-2">
              {profile.ministries?.map((ministry, index) => (
                <span key={index} className="bg-blue-100 text-blue-900 px-4 py-2 rounded-full">
                  {ministry}
                </span>
              )) || <p className="text-gray-600">Not involved in any ministries yet</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserProfilePage;