import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Eye, Play, Calendar, ArrowRight, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';
import Card from '../common/Card';

const SermonCard = ({ sermon }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sermon.likes || 0);
  const [showVideoModal, setShowVideoModal] = useState(false);
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

  // Universal video embed extractor
  const getVideoEmbedUrl = (url) => {
    if (!url) return '';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : '';
    }

    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&width=500`;
    }

    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : '';
    }

    if (url.includes('tiktok.com')) {
      return url;
    }

    return url;
  };

  const hasVideo = sermon.videoUrl && getVideoEmbedUrl(sermon.videoUrl);
  const hasThumbnail = sermon.thumbnail;
  const hasMedia = hasVideo || hasThumbnail;

  // Get preview text from HTML content
  const getPreviewText = (html, limit = 180) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.innerText || temp.textContent || '';
    if (text.length <= limit) return text;
    return text.substring(0, limit).trim() + '...';
  };

  const contentHtml = sermon.descriptionHtml || sermon.description || '';
  const previewText = getPreviewText(contentHtml);

  // Debug logging
  useEffect(() => {
    if (sermon._id) {
      console.log(`🎤 SermonCard [${sermon.title}]:`, {
        hasDescriptionHtml: !!sermon.descriptionHtml,
        hasDescription: !!sermon.description,
        contentLength: contentHtml.length,
        firstChar: contentHtml.substring(0, 50)
      });
    }
  }, [sermon._id, sermon.descriptionHtml, sermon.description]);

  // ✅ FIX #1: Proper DOMPurify config to allow Cloudinary images
  const sanitizedHtml = DOMPurify.sanitize(contentHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'img', 'a'],
    ALLOWED_ATTR: ['src', 'alt', 'class', 'style', 'href', 'title'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: true
  });

  // Debug: Check if images are in HTML
  if (contentHtml.includes('<img')) {
    console.log(`✅ Images detected in ${sermon.title}`);
    console.log(`📸 Sanitized HTML includes img:`, sanitizedHtml.includes('<img'));
  }

  // Check if content has substantial text (more than preview length)
  const hasMoreContent = (sermon.descriptionHtml || sermon.description).length > 180;

  return (
    <>
      {/* ✅ FIX #3: Removed overflow-hidden, added overflow-visible */}
      <Card className="flex flex-col hover:shadow-lg transition-shadow h-full overflow-visible">
        
        {/* Header: Category + Date */}
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-100">
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
        <div className="px-5 pt-4 pb-3 flex items-center gap-3">
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
        <h3 className="px-5 text-lg font-bold text-red-900 line-clamp-2 leading-snug underline text-center mb-3">
          {sermon.title}
        </h3>

        {/* Main Thumbnail/Video (After Title) */}
        {hasMedia && (
          <div className="relative aspect-video bg-slate-100 overflow-hidden group mx-5 mb-4 rounded-lg flex-shrink-0">
            <img
              src={hasThumbnail ? sermon.thumbnail : 'https://via.placeholder.com/600x340?text=Sermon'}
              alt={sermon.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/600x340?text=Image+Error';
              }}
            />
            {hasVideo && (
              <button
                onClick={() => setShowVideoModal(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all"
              >
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-xl group-hover:scale-110 transition-transform">
                  <Play size={32} className="text-blue-600 fill-current" />
                </div>
              </button>
            )}
          </div>
        )}

        {/* ✅ FIX #2: Show HTML content always, clamp height when collapsed */}
        <div className="px-5 flex-grow mb-4">
          {/* Always render HTML content (with images), but clamp height when collapsed */}
          <div
            className={`prose prose-sm max-w-none text-gray-800 transition-all duration-300 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-4 [&_p]:text-gray-800 [&_strong]:font-bold [&_em]:italic ${
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

        {/* Footer: Stats + Action */}
        <div className="px-5 pt-4 border-t border-gray-200 space-y-4 mt-auto">
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

          {/* Watch/View Sermon Button */}
          <Link
            to={`/sermons/${sermon._id}`}
            className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-semibold hover:shadow-md transition-all transform hover:-translate-y-0.5 group"
          >
            <span>{hasVideo ? 'Watch Sermon' : 'View Sermon'}</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </Card>

      {/* Video Modal */}
      {showVideoModal && hasVideo && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition"
            >
              <X size={24} />
            </button>
            
            <div className="relative" style={{ paddingBottom: sermon.videoUrl?.includes('tiktok.com') ? '177.78%' : '56.25%' }}>
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