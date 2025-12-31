import React from 'react';
import { Calendar, Clock, Play, Download } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatDate, formatDuration } from '../../utils/helpers';

const SermonCard = ({ sermon }) => {
  return (
    <Card hover className="overflow-hidden">
      <div className="bg-gradient-to-br from-blue-900 to-purple-900 h-48 flex items-center justify-center text-6xl">
        🎥
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold text-blue-900 mb-2">{sermon.title}</h3>
        <p className="text-gray-600 mb-2">{sermon.pastor}</p>
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar size={16} /> {formatDate(sermon.date, 'short')}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={16} /> {formatDuration(sermon.duration)}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" icon={Play} className="flex-1">
            Watch
          </Button>
          <Button variant="outline" size="sm" icon={Download} />
        </div>
      </div>
    </Card>
  );
};

export default SermonCard;