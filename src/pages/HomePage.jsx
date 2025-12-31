// src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import HeroSection from '../components/home/HeroSection';
import QuickInfoBar from '../components/home/QuickInfoBar';
import AboutSection from '../components/about/AboutSection';
import LiveStreamSection from '../components/home/LiveStreamSection';
import SermonList from '../components/sermons/SermonList';
import EventList from '../components/events/EventList';
import MinistryCard from '../components/ministries/MinistryCard';
import DonationSection from '../components/donations/DonationSection';
import { SEO_META } from '../utils/constants';

const HomePage = () => {
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
  }, []);

  return (
    <div className="home-page">
      <HeroSection />
      <QuickInfoBar />
      <AboutSection preview />
      <LiveStreamSection />

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Recent Sermons</h2>
            <p className="text-xl text-gray-600">Watch and grow in your faith</p>
          </div>
          <SermonList limit={3} showViewAll />
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Upcoming Events</h2>
            <p className="text-xl text-gray-600">Join us for these special gatherings</p>
          </div>
          <EventList limit={3} showViewAll />
        </div>
      </section>

      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">Our Ministries</h2>
            <p className="text-xl text-gray-600">Find your place to serve and grow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <MinistryCard name="Children's Ministry" description="Nurturing young hearts in faith" icon="👶" />
            <MinistryCard name="Youth Ministry" description="Empowering the next generation" icon="🌟" />
            <MinistryCard name="Worship Team" description="Leading hearts in worship" icon="🎵" />
          </div>
        </div>
      </section>

      <DonationSection />
    </div>
  );
};

export default HomePage;