// src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { Pin, ArrowRight } from 'lucide-react';
import HeroSection from '../components/home/HeroSection';
import QuickInfoBar from '../components/home/QuickInfoBar';
import AboutSection from '../components/about/AboutSection';
import LiveStreamSection from '../components/home/LiveStreamSection';
import EventList from '../components/events/EventList';
import MinistryCard from '../components/ministries/MinistryCard';
import DonationSection from '../components/donations/DonationSection';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import { SEO_META } from '../utils/constants';
import { sermonService } from '../services/api/sermonService';
import { Link } from 'react-router-dom';

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
      const data = await sermonService.getSermons({ limit: 3 });
      const allSermons = data.sermons || [];
      const recentSermons = allSermons
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);
      setSermons(recentSermons);
    } catch (error) {
      console.error('Error fetching sermons:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Quick Info Bar */}
      <QuickInfoBar />

      {/* About Section */}
      <section className="py-16 md:py-24 bg-slate-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <AboutSection preview />
        </div>
      </section>

      {/* Live Stream Section */}
      <LiveStreamSection />

      {/* Latest Sermon Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Section Header */}
          <div className="mb-12 md:mb-16">
            <div className="flex items-center gap-3 mb-4">
              <Pin size={28} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                Latest Sermon
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Watch the Latest <span className="text-blue-600">Sermon</span>
            </h2>
            <p className="text-xl text-slate-600">
              Grow in faith with our most recent teachings and messages
            </p>
          </div>

          {loading ? (
            <Loader />
          ) : sermons.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-600 text-lg">No sermons available yet</p>
            </div>
          ) : (
            <div>
              {/* Featured Sermon Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl mb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 md:p-12">
                  <div className="flex flex-col justify-center">
                    <span className="inline-block w-fit px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-bold mb-4">
                      Featured Sermon
                    </span>
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                      {sermons[0]?.title || 'Latest Teaching'}
                    </h3>
                    <p className="text-slate-300 text-lg mb-6 line-clamp-3">
                      {sermons[0]?.description || 'Join us for an inspiring message'}
                    </p>
                    <Link to="/sermons">
                      <Button variant="secondary" size="lg" className="w-fit">
                        Watch Now <ArrowRight size={20} />
                      </Button>
                    </Link>
                  </div>
                  <div className="bg-blue-600/20 rounded-2xl h-80 flex items-center justify-center border-2 border-blue-600/40">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🎙️</div>
                      <p className="text-white font-semibold">Sermon Media</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Browse All Sermons */}
              <div className="text-center">
                <Link to="/sermons">
                  <Button variant="primary" size="lg">
                    Browse All Sermons <ArrowRight size={20} />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Events Section */}
      <section className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-12 md:mb-16">
            <span className="inline-block px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-bold mb-4 uppercase tracking-widest">
              What's Happening
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Upcoming <span className="text-blue-600">Events</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl">
              Join us for special gatherings and connect with our community
            </p>
          </div>
          <EventList limit={3} showViewAll />
        </div>
      </section>

      {/* Ministries Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="mb-12 md:mb-16">
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-bold mb-4 uppercase tracking-widest">
              Get Connected
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Our <span className="text-blue-600">Ministries</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl">
              Find your place to serve, grow, and make an impact in our community
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            <MinistryCard 
              name="Children's Ministry" 
              description="Nurturing young hearts in faith and building a strong foundation for spiritual growth" 
              icon="👶" 
            />
            <MinistryCard 
              name="Youth Ministry" 
              description="Empowering the next generation to live out their faith boldly and authentically" 
              icon="⭐" 
            />
            <MinistryCard 
              name="Worship Team" 
              description="Leading hearts in worship and creating space for divine encounter with God" 
              icon="🎵" 
            />
            <MinistryCard 
              name="Small Groups" 
              description="Building genuine community through fellowship, prayer, and biblical study" 
              icon="👥" 
            />
            <MinistryCard 
              name="Prayer Ministry" 
              description="Interceding for our church, community, and world with faith and compassion" 
              icon="🙏" 
            />
            <MinistryCard 
              name="Outreach" 
              description="Serving our community and sharing the transformative love of Jesus" 
              icon="❤️" 
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