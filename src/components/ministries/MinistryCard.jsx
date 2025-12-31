import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';

const MinistryCard = ({ name, description, icon }) => {
  return (
    <Card hover className="text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-blue-900 mb-3">{name}</h3>
      <p className="text-gray-600 mb-4">{description}</p>
     <Link to={`/ministries/${name.toLowerCase().replace(/\s+/g, '-')}`} className="text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1 mx-auto transition-colors">
      Learn More <ChevronRight size={16} />
      </Link>
    </Card>
  );
};

export default MinistryCard;