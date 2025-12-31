import React from 'react';
import MinistryCard from '../components/ministries/MinistryCard';
import { ministriesData } from '../data/ministries';

const MinistriesPage = () => {
  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-blue-900 mb-4">Our Ministries</h1>
          <p className="text-xl text-gray-600">Find your place to serve and grow</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {ministriesData.map((ministry, index) => (
            <MinistryCard key={index} {...ministry} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MinistriesPage;