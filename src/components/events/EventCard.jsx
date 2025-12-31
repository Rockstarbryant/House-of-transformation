import React from 'react';
import { Clock, MapPin } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatDate } from '../../utils/helpers';

const EventCard = ({ event }) => {
  return (
    <Card hover>
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="bg-blue-900 text-white rounded-lg p-4 text-center min-w-[80px]">
          <p className="text-3xl font-bold">{new Date(event.date).getDate()}</p>
          <p className="text-sm">{new Date(event.date).toLocaleString('default', { month: 'short' })}</p>
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-blue-900 mb-2">{event.title}</h3>
          <p className="text-gray-600 mb-1 flex items-center gap-2">
            <Clock size={16} /> {event.time}
          </p>
          <p className="text-gray-600 flex items-center gap-2">
            <MapPin size={16} /> {event.location}
          </p>
        </div>
        <Button variant="secondary">Learn More</Button>
      </div>
    </Card>
  );
};

export default EventCard;