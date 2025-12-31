import React from 'react';
import { Award } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { useAuthContext } from '../../context/AuthContext';

const OpportunityCard = ({ opportunity }) => {
  const { isAuthenticated } = useAuthContext();

  const handleApply = () => {
    if (!isAuthenticated) {
      alert('Please sign in to apply');
      return;
    }
    alert('Application submitted!');
  };

  return (
    <Card hover>
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="text-5xl">{opportunity.icon}</div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-blue-900 mb-2">{opportunity.title}</h3>
          <p className="text-gray-700 mb-3">{opportunity.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1 text-gray-600">
              <Award size={16} /> {opportunity.requirements}
            </span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
              {opportunity.spots} spots available
            </span>
          </div>
        </div>
        <Button variant="primary" onClick={handleApply}>Apply Now</Button>
      </div>
    </Card>
  );
};

export default OpportunityCard;