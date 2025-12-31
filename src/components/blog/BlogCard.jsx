import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Card from '../common/Card';
import { formatDate, truncateText } from '../../utils/helpers';

const BlogCard = ({ post }) => {
  const navigate = useNavigate();

  const handleReadMore = () => {
    navigate(`/blog/${post._id}`);
  };

  return (
    <Card hover className="overflow-hidden cursor-pointer" onClick={handleReadMore}>
      <div className="bg-gradient-to-br from-blue-900 to-purple-900 h-48 flex items-center justify-center text-6xl">
        {post.image || '📰'}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full font-semibold">
            {post.category}
          </span>
          <span>{formatDate(post.createdAt || post.date, 'short')}</span>
        </div>
        <h3 className="text-xl font-bold text-blue-900 mb-3">{post.title}</h3>
        <p className="text-gray-600 mb-4">{truncateText(post.excerpt || post.content, 120)}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">By {post.author?.name || 'Unknown'}</span>
          <button 
            onClick={handleReadMore}
            className="text-blue-900 font-semibold hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Read More <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
};

export default BlogCard;