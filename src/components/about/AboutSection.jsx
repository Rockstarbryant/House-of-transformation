import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../common/Card.jsx';
import Button from '../common/Button';

const AboutSection = ({ preview = false }) => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-4">About Us</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A community of believers committed to transforming lives through God's love
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
  <div className="relative overflow-hidden h-96 rounded-2xl shadow-2xl">
    <img 
      src="/images/church-building.jpg"  // <-- Your image here
      alt="House of Transformation Church, Busia County, Kenya"
      className="w-full h-full object-cover"
    />
    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40"></div>
      </div>
        </div>
          <div className="space-y-6">
            <h3 className="text-3xl font-bold text-blue-900">Our Mission</h3>
            <p className="text-gray-700 leading-relaxed">
              At House of Transformation, we believe in the power of God to transform lives. 
              Located in the heart of Busia County, Kenya, we are a vibrant community of believers 
              dedicated to spreading the gospel, nurturing spiritual growth, and serving our community.
            </p>
            {preview && (
              <Link to="/about">
                <Button variant="primary">Learn More About Us</Button>
              </Link>
            )}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <Card padding="sm" className="text-center">
                <p className="text-4xl font-bold text-blue-900">500+</p>
                <p className="text-sm text-gray-600">Members</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-4xl font-bold text-blue-900">15+</p>
                <p className="text-sm text-gray-600">Ministries</p>
              </Card>
              <Card padding="sm" className="text-center">
                <p className="text-4xl font-bold text-blue-900">8</p>
                <p className="text-sm text-gray-600">Years</p>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;