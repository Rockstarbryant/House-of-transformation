// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { Pin } from 'lucide-react';
import HeroSection from '../components/home/HeroSection';
import QuickInfoBar from '../components/home/QuickInfoBar';
import AboutSection from '../components/about/AboutSection';
import LiveStreamSection from '../components/home/LiveStreamSection';
import SermonCardText from '../components/sermons/SermonCardText';
import SermonCard from '../components/sermons/SermonCard';
import EventList from '../components/events/EventList';
import MinistryCard from '../components/ministries/MinistryCard';
import DonationSection from '../components/donations/DonationSection';
import Loader from '../components/common/Loader';
import { SEO_META } from '../utils/constants';
import { sermonService } from '../services/api/sermonService';

const HomePage = () => {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = SEO_META.title;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', SEO_META.description);
    }
    
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute('content', SEO_META.keywords);
    }

    fetchSermons();
  }, []);

  const fetchSermons = async () => {
    try {
      setLoading(true);
      const data = await sermonService.getSermons({ limit: 100 });
      const allSermons = data.sermons || [];
      // Filter pinned sermons, sort by date desc
      const pinnedSermons = allSermons
        .filter(s => s.pinned)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      setSermons(pinnedSermons);
    } catch (error) {
      console.error('Error fetching sermons:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectSermonType = (sermon) => {
    if (sermon.videoUrl) return 'video';
    if (sermon.thumbnail) return 'photo';
    return 'text';
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Quick Info Bar - overlaps hero */}
      <QuickInfoBar />

      {/* About Section with spacing */}
      <div className="pt-20">
        <AboutSection preview />
      </div>

      {/* Live Stream Section */}
      <LiveStreamSection />

      {/* Featured Sermons Section - Modern X Style */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Section Header */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center gap-2 mb-3">
              <Pin size={24} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                Pinned Sermons
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Featured Sermons
            </h2>
            <p className="text-lg text-gray-600">
              Grow in faith with our most recent teachings
            </p>
          </div>

          {loading ? (
            <Loader />
          ) : sermons.length === 0 ? (
            <div className="text-center py-12 md:py-16">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-gray-600 text-lg">No featured sermons yet</p>
              <p className="text-gray-500 mt-2">Check back soon</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Text Only Sermons */}
              {sermons.filter(s => detectSermonType(s) === 'text').length > 0 && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white hover:bg-gray-50 transition-colors">
                  {sermons
                    .filter(s => detectSermonType(s) === 'text')
                    .map((sermon, idx) => (
                      <div key={sermon._id}>
                        <SermonCardText sermon={sermon} />
                        {idx < sermons.filter(s => detectSermonType(s) === 'text').length - 1 && (
                          <div className="border-b border-gray-100" />
                        )}
                      </div>
                    ))}
                </div>
              )}

              {/* Media Sermons Grid */}
              {sermons.filter(s => detectSermonType(s) !== 'text').length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {sermons
                    .filter(s => detectSermonType(s) !== 'text')
                    .map(sermon => (
                      <SermonCard
                        key={sermon._id}
                        sermon={sermon}
                        type={detectSermonType(sermon)}
                      />
                    ))}
                </div>
              )}

              {/* View All Link */}
              <div className="text-center mt-8 md:mt-12">
                <a
                  href="/sermons"
                  className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-full hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-lg"
                >
                  Explore All Sermons
                  <span>→</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16 md:py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-bold mb-4 uppercase tracking-wide">
              What's Happening
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Upcoming Events
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join us for these special gatherings and connect with our community
            </p>
          </div>
          <EventList limit={3} showViewAll />
        </div>
      </section>

      {/* Ministries Section */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="text-center mb-12 md:mb-16">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-bold mb-4 uppercase tracking-wide">
              Get Connected
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Our Ministries
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Find your place to serve, grow, and make an impact
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <MinistryCard 
              name="Children's Ministry" 
              description="Nurturing young hearts in faith and building a strong foundation" 
              icon="👶" 
            />
            <MinistryCard 
              name="Youth Ministry" 
              description="Empowering the next generation to live out their faith boldly" 
              icon="⭐" 
            />
            <MinistryCard 
              name="Worship Team" 
              description="Leading hearts in worship and creating space for encounter" 
              icon="🎵" 
            />
          </div>
        </div>
      </section>

      {/* Donation Section */}
      <DonationSection />
    </div>
  );
};

export default HomePage;