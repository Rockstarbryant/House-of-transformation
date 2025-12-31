import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { blogService } from '../../services/api/blogService';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';

const ManageBlog = () => {
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: 'News',
    image: '',
    published: true
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const data = await blogService.getPosts();
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await blogService.createPost(formData);
      alert('Blog post created!');
      setShowForm(false);
      setFormData({ title: '', content: '', excerpt: '', category: 'News', image: '', published: true });
      fetchPosts();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this post?')) {
      try {
        await blogService.deletePost(id);
        alert('Post deleted!');
        fetchPosts();
      } catch (error) {
        alert('Error deleting post');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900">Manage Blog</h1>
        <Button variant="primary" icon={Plus} onClick={() => setShowForm(!showForm)}>
          New Post
        </Button>
      </div>

      {showForm && (
        <Card className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Create New Post</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="title"
              label="Post Title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
            <Input
              name="excerpt"
              label="Excerpt (Short Summary)"
              value={formData.excerpt}
              onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
              required
            />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({...formData, content: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                rows="10"
                required
              />
            </div>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option>News</option>
              <option>Events</option>
              <option>Outreach</option>
              <option>Teaching</option>
              <option>Testimonies</option>
            </select>
            <Input
              name="image"
              label="Featured Image URL"
              value={formData.image}
              onChange={(e) => setFormData({...formData, image: e.target.value})}
              placeholder="https://..."
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.published}
                onChange={(e) => setFormData({...formData, published: e.target.checked})}
                className="w-5 h-5"
              />
              <span>Publish immediately</span>
            </label>
            <div className="flex gap-4">
              <Button type="submit" variant="primary">Create Post</Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Card key={post._id || post.id} hover>
            <div className="mb-4">
              <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-sm font-semibold">
                {post.category}
              </span>
            </div>
            <h3 className="text-xl font-bold text-blue-900 mb-2">{post.title}</h3>
            <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {new Date(post.createdAt).toLocaleDateString()}
              </span>
              <div className="flex gap-2">
                <button className="p-2 text-blue-900 hover:bg-blue-50 rounded">
                  <Edit size={20} />
                </button>
                <button 
                  onClick={() => handleDelete(post._id || post.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ManageBlog;