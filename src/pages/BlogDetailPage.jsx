import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, AlertCircle } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';
import { blogService } from '../services/api/blogService';
import { formatDate } from '../utils/helpers';

const BlogDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEditBlog, canDeleteBlog, user } = useAuthContext();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const data = await blogService.getBlog(id);
      setPost(data.blog || data);
      setError(null);
    } catch (err) {
      console.error('Error fetching post:', err);
      setError('Failed to load blog post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this blog post?')) {
      return;
    }

    try {
      setDeleting(true);
      await blogService.deleteBlog(id);
      alert('Blog post deleted successfully!');
      navigate('/blog');
    } catch (err) {
      console.error('Error deleting post:', err);
      alert('Failed to delete blog post');
    } finally {
      setDeleting(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      member: 'text-gray-600',
      volunteer: 'text-indigo-600',
      usher: 'text-green-600',
      worship_team: 'text-yellow-600',
      pastor: 'text-red-600',
      bishop: 'text-blue-600',
      admin: 'text-purple-600'
    };
    return colors[role] || 'text-gray-600';
  };

  const getCategoryColor = (category) => {
    const colors = {
      testimonies: 'bg-purple-100 text-purple-800',
      events: 'bg-blue-100 text-blue-800',
      teaching: 'bg-green-100 text-green-800',
      news: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      testimonies: 'Testimony',
      events: 'Event',
      teaching: 'Teaching',
      news: 'News'
    };
    return labels[category] || category;
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-blue-900 hover:text-blue-700 mb-6 font-semibold"
          >
            <ArrowLeft size={20} /> Back to Blog
          </button>
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="pt-20 pb-20 bg-gray-50 min-h-screen">
        <div className="max-w-3xl mx-auto px-4">
          <button
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-blue-900 hover:text-blue-700 mb-6 font-semibold"
          >
            <ArrowLeft size={20} /> Back to Blog
          </button>
          <div className="text-center text-gray-500 text-lg">Blog post not found</div>
        </div>
      </div>
    );
  }

  const canEdit = canEditBlog(post.author?._id);
  const canDelete = canDeleteBlog(post.author?._id);

  return (
    <div className="pt-20 pb-20 bg-teal-400 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 text-blue-900 hover:text-blue-700 mb-8 font-semibold transition-colors"
        >
          <ArrowLeft size={20} /> Back to Blog
        </button>

        <article className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Featured Image */}
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 h-96 flex items-center justify-center text-8xl overflow-hidden">
            {post.image ? (
              <img
                src={post.image}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              '📰'
            )}
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getCategoryColor(post.category)}`}>
                {getCategoryLabel(post.category)}
              </span>

              {post.approved === false && (
                <span className="px-4 py-2 rounded-full font-semibold text-sm bg-yellow-100 text-yellow-800">
                  Pending Approval
                </span>
              )}

              <span className="text-gray-600">
                {post.createdAt ? formatDate(post.createdAt, 'long') : 'Date unknown'}
              </span>
            </div>

            {/* Author Information */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <div>
                <p className="text-gray-600">By</p>
                <p className={`text-lg font-bold ${getRoleColor(post.author?.role)}`}>
                  {post.author?.name || 'Unknown Author'}
                </p>
                {post.author?.role && (
                  <p className="text-sm text-gray-500 capitalize">
                    {post.author.role.replace('_', ' ')}
                  </p>
                )}
              </div>

              {/* Edit/Delete Buttons */}
              {(canEdit || canDelete) && (
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      className="p-2 text-blue-900 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                      title="Edit (Coming soon)"
                      disabled
                    >
                      <Edit size={20} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                      title="Delete blog"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">
              {post.title}
            </h1>

            {/* Description/Excerpt */}
            {post.description && (
              <p className="text-lg text-gray-700 italic mb-8 pb-8 border-b border-gray-200">
                {post.description}
              </p>
            )}

            {/* Body Content */}
            <div className="prose prose-lg max-w-none text-gray-800 leading-relaxed mb-12">
              {post.content ? (
                <div className="whitespace-pre-wrap">
                  {post.content}
                </div>
              ) : (
                <p className="text-gray-500">No content available</p>
              )}
            </div>

            {/* Author Section */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mt-12 border-l-4 border-blue-900">
              <h3 className="font-bold text-blue-900 mb-3 text-lg">About the Author</h3>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {post.author?.name?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{post.author?.name || 'Church Administrator'}</p>
                  {post.author?.role && (
                    <p className="text-sm text-gray-600 capitalize">
                      {post.author.role.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-600 mb-4">Found this helpful?</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate('/blog')}
                  className="flex-1"
                >
                  Read More Posts
                </Button>
                <Button
                  variant="primary"
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${window.location.href}`, '_blank')}
                  className="flex-1"
                >
                  Share
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default BlogDetailPage;