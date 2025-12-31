import React from 'react';
import { Play } from 'lucide-react';
import Button from '../common/Button';

const LiveStreamSection = () => {
  const streamUrl = localStorage.getItem('liveStreamUrl');

  return (
    <section className="py-20 bg-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Join Us Live</h2>
          <p className="text-xl text-gray-300">Watch our services from anywhere</p>
        </div>
        <div className="max-w-4xl mx-auto">
          {streamUrl ? (
            <iframe
              src={streamUrl}
              className="w-full aspect-video rounded-2xl"
              allowFullScreen
            />
          ) : (
            <div className="bg-black/30 rounded-2xl aspect-video flex items-center justify-center">
              <div className="text-center">
                <p className="text-2xl font-bold">No live stream active</p>
                <p className="text-gray-300 mt-4">Next service: Sunday, 9:00 AM</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LiveStreamSection;