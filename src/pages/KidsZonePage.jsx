import React from 'react';
import { Baby } from 'lucide-react';
import KidsStories from '../components/kids/KidsStories';
import KidsActivities from '../components/kids/KidsActivities';
import KidsVideos from '../components/kids/KidsVideos';
import { kidsData } from '../data/kidsContent';

const KidsZonePage = () => {
  return (
    <div className="pt-20 pb-20 bg-gradient-to-br from-yellow-400 via-orange-400 to-pink-400 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
            <Baby size={48} /> Kids Zone
          </h1>
          <p className="text-xl text-white/90">Fun Bible stories, games, and activities for children</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <KidsStories stories={kidsData.stories} />
          <KidsActivities activities={kidsData.activities} />
          <KidsVideos videos={kidsData.videos} />
        </div>
      </div>
    </div>
  );
};

export default KidsZonePage;