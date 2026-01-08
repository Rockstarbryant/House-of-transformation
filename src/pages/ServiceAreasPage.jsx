import React from 'react';
import ServiceAreaCard from '../components/serviceAreas/ServiceAreaCard';
import { serviceAreasData } from '../data/serviceAreas';

const ServiceAreasPage = () => {
  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-4 py-2 rounded-full">
              House of Transformation Nairobi
            </span>
          </div>
          <h1 className="text-5xl font-bold text-blue-900 mb-4">Service Areas & Teams</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover how you can use your God-given talents to serve and make a meaningful impact in our community
          </p>
        </div>

        {/* Service Areas Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceAreasData.map((area, index) => (
            <ServiceAreaCard key={index} {...area} />
          ))}
        </div>

        {/* Call to Action Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Serve?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Join our community of passionate servants dedicated to transforming lives and building God's kingdom
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Get Involved Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceAreasPage;