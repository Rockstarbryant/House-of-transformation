import React from 'react';
import { Calendar, MapPin, Heart } from 'lucide-react';
import { CHURCH_INFO, SERVICE_TIMES } from '../../utils/constants';

const QuickInfoBar = () => {
  return (
    <section className="bg-yellow-400 py-6">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="flex items-center justify-center gap-3">
          <Calendar className="text-blue-900" size={32} />
          <div className="text-left">
            <p className="font-bold text-blue-900">{SERVICE_TIMES.sunday.service}</p>
            <p className="text-sm text-blue-800">{SERVICE_TIMES.sunday.time}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <MapPin className="text-blue-900" size={32} />
          <div className="text-left">
            <p className="font-bold text-blue-900">Location</p>
            <p className="text-sm text-blue-800">{CHURCH_INFO.location}</p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Heart className="text-blue-900" size={32} />
          <div className="text-left">
            <p className="font-bold text-blue-900">Get Involved</p>
            <p className="text-sm text-blue-800">Join a Ministry Today</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickInfoBar;