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

  // Get preview text from HTML content
  const getPreviewText = (html, limit = 180) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.innerText || temp.textContent || '';
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + '...';
  };

  const previewText = getPreviewText(sermon.descriptionHtml || sermon.description);

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow h-full bg-slate-300 text-left">
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
          <p className="text-xs text-gray-500">@Busia_HOT</p>
        </div>
      </div>

      {/* Sermon Description */}
      <div className="flex-grow mb-4">

        {/* Sermon Title */}
        <h3 className="text-lg font-bold text-red-900 line-clamp-2 leading-snug underline text-center">
          {sermon.title}
        </h3>

        {/* Content Preview or Full */}
        {expanded ? (
          // Full content with HTML rendered
          <div 
            className="prose prose-sm max-w-none text-gray-800 mt-3"
            dangerouslySetInnerHTML={{ __html: sermon.descriptionHtml || sermon.description }}
          />
        ) : (
          // Preview text only
          <p className="text-gray-800 text-sm leading-relaxed text-center font-semibold italic mt-3">
            {previewText}
          </p>
        )}

        {(sermon.descriptionHtml || sermon.description) && (sermon.descriptionHtml || sermon.description).length > 180 && (
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

        {/* View Full Sermon Button */}
        <Link
          to={`/sermons/${sermon._id}`}
          className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-md transition-all transform hover:-translate-y-0.5 group"
        >
          <span>View Full Sermon</span>
          <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </Card>
  );
};

export default SermonCardText;