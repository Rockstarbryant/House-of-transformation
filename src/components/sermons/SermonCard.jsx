import React, { useState } from 'react';
import { Heart, MessageCircle, Share, Eye, Play } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';

const SermonCard = ({ sermon, type = 'photo' }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sermon.likes || 0);
  const [showVideo, setShowVideo] = useState(false);
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

  const getVideoEmbedUrl = (url) => {
    if (!url) return '';
    const videoId = url.includes('youtu.be') 
      ? url.split('/').pop() 
      : url.split('v=')[1]?.split('&')[0];
    return `https://www.youtube.com/embed/${videoId}`;
  };

  // Check if description is long enough to need "Read More"
  const MAX_DISPLAY_LENGTH = 280;
  const isLongText = sermon.description && sermon.description.length > MAX_DISPLAY_LENGTH;
  const displayText = expanded || !isLongText ? sermon.description : sermon.description?.substring(0, MAX_DISPLAY_LENGTH);

  return (
    <>
      <div className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-white">
        {/* Media Section */}
        <div className="relative bg-gradient-to-br from-blue-900 to-purple-900 aspect-video flex items-center justify-center overflow-hidden group">
          {type === 'video' && sermon.videoUrl ? (
            <>
              <img 
                src={sermon.thumbnail || 'https://via.placeholder.com/500x300?text=Sermon'} 
                alt={sermon.title}
                className="w-full h-full object-cover"
              />
              <button 
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors"
              >
                <div className="bg-white/90 p-4 rounded-full">
                  <Play size={32} className="text-blue-900 fill-current" />
                </div>
              </button>
            </>
          ) : (
            <img 
              src={sermon.thumbnail || 'https://via.placeholder.com/500x300?text=Sermon'} 
              alt={sermon.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Content Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-900 to-purple-900 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {sermon.pastor?.charAt(0) || 'P'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-sm">{sermon.pastor || 'Pastor'}</span>
                <span className="text-gray-500 text-sm">@church</span>
              </div>
              <span className="text-gray-500 text-xs">{formatDate(sermon.date, 'short')}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-gray-900 text-base mb-2 break-words">{sermon.title}</h3>
          
          {/* Description with Read More */}
          {sermon.description && (
            <div className="mb-3">
              <p className="text-gray-700 text-sm leading-normal break-words whitespace-pre-wrap">
                {displayText}
                {isLongText && !expanded && '...'}
              </p>
              {isLongText && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-blue-500 font-semibold text-sm hover:text-blue-600 mt-2 transition-colors"
                >
                  {expanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>
          )}

          {/* Category Badge */}
          {sermon.category && (
            <div className="mb-3">
              <span className="inline-block bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-full font-semibold">
                {sermon.category}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between pt-3 border-t border-gray-200 text-gray-500 text-xs">
            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-1 hover:text-blue-500 flex-1 justify-center py-2 transition-colors"
            >
              <MessageCircle size={14} />
              <span>{sermon.comments || 0}</span>
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-1 hover:text-green-500 flex-1 justify-center py-2 transition-colors"
            >
              <Share size={14} />
            </button>

            <button 
              onClick={(e) => e.stopPropagation()}
              className="group flex items-center gap-1 hover:text-yellow-500 flex-1 justify-center py-2 transition-colors"
            >
              <Eye size={14} />
              <span>{sermon.views || 0}</span>
            </button>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="group flex items-center gap-1 hover:text-red-500 flex-1 justify-center py-2 transition-colors"
            >
              <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
              <span>{likes}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Video Modal */}
      {showVideo && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <iframe
              width="100%"
              height="500"
              src={getVideoEmbedUrl(sermon.videoUrl)}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SermonCard;