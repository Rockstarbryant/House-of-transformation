import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, Eye } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';

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

  const MAX_DISPLAY_LENGTH = 280;
  const isLongText = sermon.description && sermon.description.length > MAX_DISPLAY_LENGTH;
  const displayText = expanded || !isLongText ? sermon.description : sermon.description?.substring(0, MAX_DISPLAY_LENGTH);

  return (
    <div className="bg-white border-b border-slate-200 p-6 hover:bg-blue-300 transition-colors cursor-pointer">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {sermon.pastor?.charAt(0).toUpperCase() || 'P'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-bold text-slate-900">{sermon.pastor || 'Pastor'}</span>
            <span className="text-slate-600">@church</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-600">{formatDate(sermon.date, 'short')}</span>
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900 mt-2 break-words leading-snug">
            {sermon.title}
          </h3>
          
          {/* Description */}
          {sermon.description && (
            <div className="mt-3">
              <p className="text-slate-900 text-base leading-normal break-words whitespace-pre-wrap">
                {displayText}
                {isLongText && !expanded && '...'}
              </p>
              {isLongText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-blue-600 font-semibold hover:text-blue-700 mt-2 text-sm transition-colors"
                >
                  {expanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>
          )}

          {/* Category Badge */}
          {sermon.category && (
            <div className="mt-3">
              <span className="inline-block bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-full font-semibold">
                {sermon.category}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between mt-3 max-w-md text-slate-600 text-sm">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-2 hover:text-blue-600 transition-colors"
            >
              <div className="group-hover:bg-blue-600/10 rounded-full p-2 transition-colors">
                <MessageCircle size={16} />
              </div>
              <span className="text-xs group-hover:text-blue-600">{sermon.comments || 0}</span>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-2 hover:text-green-600 transition-colors"
            >
              <div className="group-hover:bg-green-600/10 rounded-full p-2 transition-colors">
                <Share2 size={16} />
              </div>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-2 hover:text-orange-600 transition-colors"
            >
              <div className="group-hover:bg-orange-600/10 rounded-full p-2 transition-colors">
                <Eye size={16} />
              </div>
              <span className="text-xs group-hover:text-orange-600">{sermon.views || 0}</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="group flex items-center gap-2 hover:text-red-600 transition-colors"
            >
              <div className="group-hover:bg-red-600/10 rounded-full p-2 transition-colors">
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </div>
              <span className="text-xs group-hover:text-red-600">{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SermonCardText;