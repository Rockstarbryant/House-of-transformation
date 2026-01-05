// src/components/sermons/SermonCard.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Eye, Play, Calendar, ArrowRight } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';
import Card from '../common/Card';

const SermonCard = ({ sermon }) => {
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
    return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  };

  const truncateText = (text, maxLength = 180) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const displayText = expanded ? sermon.description : truncateText(sermon.description);

  const hasMedia = sermon.videoUrl || sermon.thumbnail;

  return (
    <>
      <Card className="flex flex-col hover:shadow-lg transition-shadow h-full overflow-hidden">
        {/* Media Section - Thumbnail with Play Button */}
        {hasMedia && (
          <div className="relative aspect-video bg-slate-100 overflow-hidden group">
            <img
              src={sermon.thumbnail || 'https://via.placeholder.com/600x340?text=Sermon+Thumbnail'}
              alt={sermon.title}
              className="w-full h-full object-cover"
            />
            {sermon.videoUrl && (
              <button
                onClick={() => setShowVideo(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all"
              >
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-xl group-hover:scale-110 transition-transform">
                  <Play size={32} className="text-blue-600 fill-current" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* Card Body */}
        <div className="p-5 flex flex-col flex-grow text-left">
          {/* Header: Category + Date */}
          <div className="flex items-center justify-between mb-3">
            {sermon.category && (
              <span className="inline-block px-3 py-1 bg-red-100 text-blue-800 text-xs font-semibold rounded-full">
                {sermon.category}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar size={12} />
              {formatDate(sermon.date, 'short')}
            </span>
          </div>

          

          {/* Pastor Info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {sermon.pastor?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">
                {sermon.pastor || 'Pastor'}
              </p>
              <p className="text-xs text-gray-500">@Busia_HOT</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-red-900 line-clamp-2 mb-3 leading-snug underline text-center">
            {sermon.title}
          </h3>

          {/* Description Preview */}
          {sermon.description && (
            <div className="flex-grow mb-4">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {displayText}
              </p>
              {sermon.description.length > 180 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                  className="text-blue-600 font-semibold text-sm hover:text-blue-700 mt-2 inline-block"
                >
                  {expanded ? 'Show Less' : 'Read More'}
                </button>
              )}
            </div>
          )}

          {/* Footer: Stats + Action Button */}
          <div className="pt-4 border-t border-gray-200 space-y-4">
            {/* Interaction Stats */}
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

            {/* Watch Sermon Button */}
            <Link
              to={`/sermons/${sermon._id}`}
              className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-md transition-all transform hover:-translate-y-0.5 group"
            >
              <span>{sermon.videoUrl ? 'Watch Sermon' : 'View Sermon'}</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Fullscreen Video Modal */}
      {showVideo && sermon.videoUrl && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideo(false)}
              className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <div className="relative pt-[56.25%]">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={getVideoEmbedUrl(sermon.videoUrl)}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={sermon.title}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SermonCard;