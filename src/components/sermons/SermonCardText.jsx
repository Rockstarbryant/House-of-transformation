// src/components/sermons/SermonCardText.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Eye, Calendar, ArrowRight } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';
import Card from '../common/Card';

const SermonCardText = ({ sermon }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sermon.likes || 0);
  const [expanded, setExpanded] = useState(false);

  const handleLike = async () => {
    try {
      await sermonService.toggleLike(sermon._id);
      setLiked(!liked);
      setLikes(liked ? likes - 1 : likes + 1);
    } catch (error) {
      console.error('Error liking sermon:', error);
    }
  };

  const truncateText = (text, maxLength = 180) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const displayText = expanded ? sermon.description : truncateText(sermon.description);

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow h-full bg-slate-300">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          {/* Category Badge */}
          {sermon.category && (
            <span className="inline-block px-3 py-1 bg-red-300 text-blue-800 text-xs font-semibold rounded-full">
              {sermon.category}
            </span>
          )}

          {/* Date */}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={12} />
            {formatDate(sermon.date, 'short')}
          </span>
        </div>

        {/* Sermon Title */}
        <h3 className="text-lg font-bold text-red-900 line-clamp-2 leading-snug underline">
          {sermon.title}
        </h3>
      </div>

      {/* Pastor Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {sermon.pastor?.charAt(0).toUpperCase() || 'P'}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">
            {sermon.pastor || 'Pastor'}
          </p>
          <p className="text-xs text-gray-500">@church</p>
        </div>
      </div>

      {/* Sermon Description Preview */}
      <div className="flex-grow mb-4">
        <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
        {sermon.description && sermon.description.length > 180 && !expanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            className="text-blue-600 font-semibold text-sm hover:text-blue-700 mt-2 inline-block"
          >
            Read More
          </button>
        )}
        {expanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
            className="text-blue-600 font-semibold text-sm hover:text-blue-700 mt-2 inline-block"
          >
            Show Less
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 space-y-4">
        {/* Stats Row */}
        <div className="flex justify-between text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MessageCircle size={16} />
            <span>{sermon.comments || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye size={16} />
            <span>{sermon.views || 0}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            className="flex items-center gap-1 text-red-500 hover:text-red-600 transition"
          >
            <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
            <span>{likes}</span>
          </button>
          <button
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-gray-600 hover:text-green-600 transition"
          >
            <Share2 size={16} />
          </button>
        </div>

        {/* Read Full Sermon Button */}
        
      </div>
    </Card>
  );
};

export default SermonCardText;