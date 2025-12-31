// src/components/home/HeroSection.jsx
import React, { useState } from 'react';
import { Play, X } from 'lucide-react'; // Add X for close icon
import Button from '../common/Button';

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Replace with your actual YouTube live embed URL
  // Example for channel live: https://www.youtube.com/embed/live_stream?channel=UCYOURCHANNELID
  // Example for specific video: https://www.youtube.com/embed/VIDEO_ID
  const youtubeEmbedUrl = "https://www.youtube.com/embed/peKWWYI70wI?si=4_lY8fmBlagW4x4";

  return (
    <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 text-white">
      <div className="absolute inset-0 bg-black/30"></div>
      <div className="relative z-10 text-center px-4 max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">Welcome Home</h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-200">
          Experience God's transforming love in Busia County
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="secondary" 
            size="lg" 
            icon={Play}
            onClick={() => setIsModalOpen(true)} // Open modal on click
          >
            Watch Live Now
          </Button>
          <Button variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
            Plan Your Visit
          </Button>
        </div>
      </div>

      {/* Modal for YouTube Live */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="relative w-full max-w-5xl">
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
              aria-label="Close live stream"
            >
              <X size={32} />
            </button>

            {/* Responsive YouTube embed (16:9 aspect ratio) */}
            <div className="relative pt-[56.25%] bg-black"> {/* 56.25% = 9/16 * 100 */}
              <iframe
                className="absolute inset-0 w-full h-full"
                src={youtubeEmbedUrl}
                title="Live Stream"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;