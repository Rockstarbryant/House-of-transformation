import React, { useState, useEffect } from 'react';
import BlogCard from './BlogCard';
import Loader from '../common/Loader';
import { blogService } from '../../services/api/blogService';

const BlogList = ({ limit, category }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPosts();
  }, [limit, category]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const data = await blogService.getPosts({ limit, category });
      setPosts(data.posts || data);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;
  
  if (error) return <div className="text-center text-red-500">{error}</div>;
  
  if (posts.length === 0) return <div className="text-center text-gray-500">No blog posts found</div>;

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {posts.map(post => (
        <BlogCard key={post._id} post={post} />
      ))}
    </div>
  );
};

export default BlogList;