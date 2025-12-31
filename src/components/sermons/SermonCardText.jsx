import React, { useState } from 'react';
import { Heart, MessageCircle, Share, Eye } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';

const SermonCardText = ({ sermon }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sermon.likes || 0);

  const handleLike = async () => {
    try {
      await sermonService.toggleLike(sermon._id);
      setLiked(!liked);
      setLikes(liked ? likes - 1 : likes + 1);
    } catch (error) {
      console.error('Error liking sermon:', error);
    }
  };

  return (
    <div className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-blue-900 to-purple-900 rounded-full flex items-center justify-center text-white font-bold">
          {sermon.pastor?.charAt(0) || 'P'}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">{sermon.pastor || 'Pastor'}</span>
            <span className="text-gray-500">@church</span>
            <span className="text-gray-500">·</span>
            <span className="text-gray-500">{formatDate(sermon.date, 'short')}</span>
          </div>

          <p className="text-gray-900 mt-2 text-base leading-normal">{sermon.title}</p>
          
          {sermon.description && (
            <p className="text-gray-700 mt-2 text-sm line-clamp-3">{sermon.description}</p>
          )}

          {/* Category Badge */}
          {sermon.category && (
            <div className="mt-2">
              <span className="inline-block bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-full font-semibold">
                {sermon.category}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-3 max-w-md text-gray-500 text-sm">
            <button className="group flex items-center gap-2 hover:text-blue-500">
              <div className="group-hover:bg-blue-500/10 rounded-full p-2">
                <MessageCircle size={16} />
              </div>
              {sermon.comments || 0}
            </button>

            <button className="group flex items-center gap-2 hover:text-green-500">
              <div className="group-hover:bg-green-500/10 rounded-full p-2">
                <Share size={16} />
              </div>
            </button>

            <button className="group flex items-center gap-2 hover:text-red-500">
              <div className="group-hover:bg-red-500/10 rounded-full p-2">
                <Eye size={16} />
              </div>
              {sermon.views || 0}
            </button>

            <button 
              onClick={handleLike}
              className="group flex items-center gap-2 hover:text-red-500"
            >
              <div className="group-hover:bg-red-500/10 rounded-full p-2">
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              </div>
              {likes}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SermonCardText;