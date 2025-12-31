import React, { useState } from 'react';
import { Heart, MessageCircle, Share, Eye } from 'lucide-react';
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

  // Check if text is long enough to need "Read More"
  const MAX_DISPLAY_LENGTH = 280;
  const isLongText = sermon.description && sermon.description.length > MAX_DISPLAY_LENGTH;
  const displayText = expanded || !isLongText ? sermon.description : sermon.description?.substring(0, MAX_DISPLAY_LENGTH);

  return (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-900 to-purple-900 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
          {sermon.pastor?.charAt(0) || 'P'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900">{sermon.pastor || 'Pastor'}</span>
            <span className="text-gray-500">@church</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{formatDate(sermon.date, 'short')}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-gray-900 mt-2 break-words">{sermon.title}</h3>
          
          {/* Description with Read More */}
          {sermon.description && (
            <div className="mt-3">
              <p className="text-gray-900 text-base leading-normal break-words whitespace-pre-wrap">
                {displayText}
                {isLongText && !expanded && '...'}
              </p>
              {isLongText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-blue-500 font-semibold hover:text-blue-600 mt-2 transition-colors"
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

          {/* Actions */}
          <div className="flex justify-between mt-3 max-w-md text-gray-500 text-sm">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-2 hover:text-blue-500 transition-colors"
            >
              <div className="group-hover:bg-blue-500/10 rounded-full p-2 transition-colors">
                <MessageCircle size={16} />
              </div>
              <span className="text-xs">{sermon.comments || 0}</span>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-2 hover:text-green-500 transition-colors"
            >
              <div className="group-hover:bg-green-500/10 rounded-full p-2 transition-colors">
                <Share size={16} />
              </div>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-2 hover:text-yellow-500 transition-colors"
            >
              <div className="group-hover:bg-yellow-500/10 rounded-full p-2 transition-colors">
                <Eye size={16} />
              </div>
              <span className="text-xs">{sermon.views || 0}</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="group flex items-center gap-2 hover:text-red-500 transition-colors"
            >
              <div className="group-hover:bg-red-500/10 rounded-full p-2 transition-colors">
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </div>
              <span className="text-xs">{likes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SermonCardText;