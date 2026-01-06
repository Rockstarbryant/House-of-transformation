import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Play,
  Calendar,
  ArrowRight,
  X
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { sermonService } from '../../services/api/sermonService';
import Card from '../common/Card';

const SermonCard = ({ sermon }) => {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(sermon.likes || 0);
  const [expanded, setExpanded] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const contentHtml = sermon.descriptionHtml || sermon.description || '';

  /* ----------------------------------------
     Extract FIRST image from TipTap HTML
  ---------------------------------------- */
  const firstImageMatch = contentHtml.match(/<img[^>]+src="([^">]+)"/);
  const firstImage = firstImageMatch?.[1] || null;

  /* ----------------------------------------
     Remove ALL images from text content
     (prevents double rendering & clipping)
  ---------------------------------------- */
  const textOnlyHtml = contentHtml.replace(/<img[^>]*>/g, '');

  /* ----------------------------------------
     Video embed helper
  ---------------------------------------- */
  const getVideoEmbedUrl = (url) => {
    if (!url) return '';

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = url.match(/(?:v=|youtu\.be\/)([^&]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (url.includes('vimeo.com')) {
      const id = url.match(/vimeo\.com\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : '';
    }

    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}`;
    }

    return url;
  };

  const hasVideo = Boolean(sermon.videoUrl);
  const videoEmbedUrl = getVideoEmbedUrl(sermon.videoUrl);

  /* ----------------------------------------
     Like handler
  ---------------------------------------- */
  const handleLike = async () => {
    try {
      await sermonService.toggleLike(sermon._id);
      setLiked(!liked);
      setLikes((prev) => (liked ? prev - 1 : prev + 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">

        {/* Header */}
        <div className="px-5 pt-5 pb-3 flex justify-between items-center border-b">
          {sermon.category && (
            <span className="px-3 py-1 bg-blue-100 text-blue-900 text-xs font-semibold rounded-full">
              {sermon.category}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar size={12} />
            {formatDate(sermon.date, 'short')}
          </span>
        </div>

        {/* Pastor */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold">
            {sermon.pastor?.charAt(0) || 'P'}
          </div>
          <div>
            <p className="font-semibold text-sm">{sermon.pastor}</p>
            <p className="text-xs text-gray-500">@Busia_HOT</p>
          </div>
        </div>

        {/* Title */}
        <h3 className="px-5 text-lg font-bold text-center text-blue-900 underline mb-3">
          {sermon.title}
        </h3>

        {/* 🔥 FIRST IMAGE (Always Visible) */}
        {firstImage && (
          <div className="px-5 mb-4">
            <img
              src={firstImage}
              alt={sermon.title}
              className="w-full rounded-lg object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* 🔥 TEXT CONTENT (Safely Clamped) */}
        <div className="px-5 mb-4 flex-grow">
          <div
            className={`prose prose-sm max-w-none text-gray-800 ${
              expanded ? '' : 'line-clamp-4'
            }`}
            dangerouslySetInnerHTML={{ __html: textOnlyHtml }}
          />

          {textOnlyHtml.length > 300 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 font-semibold text-sm mt-2"
            >
              {expanded ? 'Show Less ↑' : 'Read More ↓'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-4 border-t space-y-4 mt-auto">

          {/* Stats */}
          <div className="flex justify-between text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MessageCircle size={16} /> {sermon.comments || 0}
            </span>
            <span className="flex items-center gap-1">
              <Eye size={16} /> {sermon.views || 0}
            </span>
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-red-500"
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              {likes}
            </button>
            <Share2 size={16} />
          </div>

          {/* Action */}
          <Link
            to={`/sermons/${sermon._id}`}
            className="flex items-center justify-center gap-2 w-full bg-blue-700 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-800 transition"
          >
            {hasVideo ? 'Watch Sermon' : 'View Sermon'}
            <ArrowRight size={16} />
          </Link>
        </div>
      </Card>

      {/* Video Modal */}
      {showVideoModal && hasVideo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-3 right-3 text-white"
            >
              <X size={28} />
            </button>
            <iframe
              src={videoEmbedUrl}
              className="w-full aspect-video rounded-lg"
              allowFullScreen
              title={sermon.title}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default SermonCard;
