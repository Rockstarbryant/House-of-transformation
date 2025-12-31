import React, { useState } from 'react';
import { Clock, MapPin, X } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { formatDate } from '../../utils/helpers';

const EventCard = ({ event }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
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
          <Button 
            variant="secondary"
            onClick={() => setShowModal(true)}
          >
            Learn More
          </Button>
        </div>
      </Card>

      {/* Event Details Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-blue-900">Event Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={28} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8">
              {/* Date Badge */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl p-6 mb-6 flex items-center justify-between">
                <div>
                  <div className="text-5xl font-bold">{new Date(event.date).getDate()}</div>
                  <div className="text-lg uppercase tracking-wide">{new Date(event.date).toLocaleString('default', { month: 'long' })}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">{new Date(event.date).getFullYear()}</div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-4">
                {event.title}
              </h1>

              {/* Time */}
              {event.time && (
                <div className="flex items-center gap-3 text-gray-700 mb-3 text-lg">
                  <Clock size={24} className="text-blue-600" />
                  <span className="font-semibold">{event.time}</span>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div className="flex items-center gap-3 text-gray-700 mb-6 text-lg">
                  <MapPin size={24} className="text-blue-600" />
                  <span className="font-semibold">{event.location}</span>
                </div>
              )}

              {/* Category Badge */}
              {event.category && (
                <div className="mb-6">
                  <span className="inline-block bg-blue-100 text-blue-900 px-4 py-2 rounded-full font-semibold text-sm">
                    {event.category}
                  </span>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <button className="flex-1 bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors">
                  Register Now
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-900 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventCard;