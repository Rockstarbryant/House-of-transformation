import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Eye, Calendar, ArrowRight } from 'lucide-react';
import DOMPurify from 'dompurify';
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

  // ✅ FIX #1: Proper DOMPurify config to allow Cloudinary images
  const sanitizedHtml = DOMPurify.sanitize(
    sermon.descriptionHtml || sermon.description,
    {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'img', 'a'],
      ALLOWED_ATTR: ['src', 'alt', 'class', 'style', 'href', 'title'],
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: true
    }
  );

  // Debug: Check if images are in HTML
  if ((sermon.descriptionHtml || sermon.description || '').includes('<img')) {
    console.log(`✅ Images detected in ${sermon.title}`);
    console.log(`📸 Sanitized HTML includes img:`, sanitizedHtml.includes('<img'));
  }

  // Check if content has substantial text (more than preview length)
  const hasMoreContent = (sermon.descriptionHtml || sermon.description).length > 180;

  return (
    // ✅ FIX #3: Removed overflow-hidden, added overflow-visible
    <Card className="flex flex-col hover:shadow-lg transition-shadow h-full bg-slate-300 text-left overflow-visible">
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

        {/* ✅ FIX #2: Show HTML content always, clamp height when collapsed */}
        <div
          className={`prose prose-sm max-w-none text-gray-800 transition-all duration-300 mt-3 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4 [&_p]:text-gray-800 [&_strong]:font-bold [&_em]:italic ${
            expanded ? '' : 'max-h-60 overflow-hidden'
          }`}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />

        {/* Show "Read More" button only if content exceeds preview height */}
        {hasMoreContent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-blue-600 font-semibold text-sm hover:text-blue-700 mt-3 inline-block"
          >
            {expanded ? 'Show Less ↑' : 'Read More ↓'}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 space-y-4 mt-auto">
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