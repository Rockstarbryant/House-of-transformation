import React from 'react';
import { Play } from 'lucide-react';
import Card from '../common/Card.jsx';

const KidsVideos = ({ videos }) => {
  return (
    <Card>
      <div className="text-5xl mb-4 text-center">🎬</div>
      <h3 className="text-2xl font-bold text-blue-900 mb-4 text-center">Videos</h3>
      <div className="space-y-3">
        {videos.map(video => (
          <div key={video.id} className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{video.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900">{video.title}</h4>
                <span className="text-xs text-gray-600">{video.duration}</span>
              </div>
              <button className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors">
                <Play size={20} fill="white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default KidsVideos;