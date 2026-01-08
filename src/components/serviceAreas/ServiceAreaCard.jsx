import React from 'react';
import { ChevronRight, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';

const ServiceAreaCard = ({ name, description, icon, teamCount, timeCommitment }) => {
  return (
    <Card hover className="flex flex-col h-full group overflow-hidden">
      {/* Icon Section */}
      <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-2xl font-bold text-blue-900 mb-2">{name}</h3>
      <p className="text-gray-600 mb-6 flex-grow">{description}</p>

      {/* Meta Information */}
      <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Users size={16} className="text-blue-600" />
          <span>{teamCount} team members</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Clock size={16} className="text-blue-600" />
          <span>{timeCommitment}</span>
        </div>
      </div>

      {/* Call to Action */}
      <Link
        to={`/service-areas/${name.toLowerCase().replace(/\s+/g, '-')}`}
        className="text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1 transition-colors group/link"
      >
        Learn More
        <ChevronRight size={16} className="group-hover/link:translate-x-1 transition-transform" />
      </Link>
    </Card>
  );
};

export default ServiceAreaCard;