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
import SermonCard from '../components/sermons/SermonCard';
import SermonCardText from '../components/sermons/SermonCardText';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import { SEO_META } from '../utils/constants';
import { sermonService } from '../services/api/sermonService';
import { Link } from 'react-router-dom';

const HomePage = () => {
  const [featuredSermon, setFeaturedSermon] = useState(null);
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
      
      // ✅ FIX: First check for pinned sermons, then fall back to most recent
      const pinnedSermon = allSermons.find(s => s.pinned);
      
      if (pinnedSermon) {
        setFeaturedSermon(pinnedSermon);
      } else {
        // Get most recent sermon by date
        const recentSermon = allSermons
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        setFeaturedSermon(recentSermon);
      }
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
    <div className="home-page bg-white-200">
      {/* Hero Section */}
      <HeroSection />
      
      {/* Quick Info Bar */}
      <QuickInfoBar />

      {/* About Section */}
      <section className="py-2 md:py-3">
        <div className="max-w-full mx-auto px-4 md:px-6">
          <AboutSection preview />
        </div>
      </section>

      {/* Live Stream Section */}
      <LiveStreamSection />

      {/* ✅ UPDATED: Latest Sermon Section - Shows 1 Card Only */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Section Header */}
          <div className="mb-12 md:mb-16">
            <div className="flex items-center gap-3 mb-4">
              <Pin size={28} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-600 uppercase tracking-widest">
                {featuredSermon?.pinned ? 'Featured Sermon' : 'Latest Sermon'}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              {featuredSermon?.pinned ? 'Featured' : 'Latest'} <span className="text-blue-600">Sermon</span>
            </h2>
            <p className="text-xl text-slate-600">
              {featuredSermon?.pinned 
                ? 'Our pastor\'s most important message for you' 
                : 'Grow in faith with our most recent teachings and messages'}
            </p>
          </div>

          {loading ? (
            <Loader />
          ) : !featuredSermon ? (
            <div className="text-center py-16">
              <p className="text-slate-600 text-lg">No sermons available yet</p>
            </div>
          ) : (
            <div>
              {/* ✅ Single Sermon Card - Uses Same Components as SermonPage */}
              <div className="mb-12">
                {detectSermonType(featuredSermon) === 'text' ? (
                  <SermonCardText sermon={featuredSermon} />
                ) : (
                  <SermonCard sermon={featuredSermon} />
                )}
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