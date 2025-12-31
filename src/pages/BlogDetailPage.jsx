import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Loader from '../components/common/Loader';
import { blogService } from '../services/api/blogService';
import { formatDate } from '../utils/helpers';

const BlogDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const data = await blogService.getPost(id);
      setPost(data.post || data);
      setError(null);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load blog post');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-blue-900 hover:text-blue-700 mb-6"
          >
            <ArrowLeft size={20} /> Back to Blog
          </button>
          <div className="text-center text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center text-gray-500">Post not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 text-blue-900 hover:text-blue-700 mb-8 font-semibold"
        >
          <ArrowLeft size={20} /> Back to Blog
        </button>

        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Featured Image */}
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 h-96 flex items-center justify-center text-8xl">
            {post.image || '📰'}
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-600">
              <span className="bg-blue-100 text-blue-900 px-4 py-2 rounded-full font-semibold">
                {post.category}
              </span>
              <span>{formatDate(post.createdAt || post.date, 'long')}</span>
              <span>By {post.author?.name || 'Unknown'}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-lg text-gray-700 italic mb-8 pb-8 border-b-2 border-gray-200">
                {post.excerpt}
              </p>
            )}

            {/* Body Content */}
            <div className="prose prose-lg max-w-none text-gray-800 mb-8">
              {post.content ? (
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              ) : (
                <p>{post.body || 'No content available'}</p>
              )}
            </div>

            {/* Author Section */}
            <div className="bg-blue-50 rounded-lg p-6 mt-12 border-l-4 border-blue-900">
              <h3 className="font-bold text-blue-900 mb-2">About the Author</h3>
              <p className="text-gray-700">{post.author?.name || 'Church Administrator'}</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogDetailPage;