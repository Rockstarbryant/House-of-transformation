// src/components/home/HeroSection.jsx
import React, { useState } from 'react';
import { Play, X } from 'lucide-react';
import Button from '../common/Button';

const HeroSection = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const youtubeEmbedUrl = "https://www.youtube.com/embed/peKWWYI70wI?si=4_lY8fmBlagW4x4";

  // Church images - you can edit these URLs later
  const churchImages = [
    {
      url: 'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      alt: 'Church worship'
    },
    {
      url: 'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      alt: 'Church community'
    },
    {
      url: 'https://pbs.twimg.com/profile_images/700352011582251008/wrxEHL3q.jpg',
      alt: 'Church fellowship'
    }
  ];

  return (
    <section className="bg-purple-100 pt-32 pb-0">
      {/* Hero Text Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 text-center mb-16 md:mb-20">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
          There is <span className="text-blue-600">HOPE</span> for you,
          <br />
          His name is <span className="text-blue-600">JESUS</span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-700 mb-8">
          Sunday Services at 9:00AM, 11:00AM & 1:00PM
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            variant="secondary" 
            size="lg" 
            icon={Play}
            onClick={() => setIsModalOpen(true)}
          >
            Watch Sunday service
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
          >
            New? Start here
          </Button>
        </div>
      </div>

      {/* Hero Images Grid */}
      <div className="max-w-7xl mx-auto px-4 bg-purple-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {churchImages.map((image, index) => (
            <div 
              key={index} 
              className="relative h-64 md:h-72 lg:h-80 overflow-hidden"
            >
              <img 
                src={image.url} 
                alt={image.alt}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modal for YouTube Live */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4">
          <div className="relative w-full max-w-5xl">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition"
              aria-label="Close live stream"
            >
              <X size={32} />
            </button>

            <div className="relative pt-[56.25%] bg-black rounded-2xl overflow-hidden">
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