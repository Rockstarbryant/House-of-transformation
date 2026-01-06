import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Pin, X } from 'lucide-react';
import { sermonService } from '../../services/api/sermonService';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';

const ManageSermons = () => {
  const [sermons, setSermons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sermonType, setSermonType] = useState('text');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [pinnedCount, setPinnedCount] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    pastor: '',
    date: '',
    category: 'Sunday Service',
    description: '',
    thumbnail: '',
    videoUrl: '',
    type: 'text'
  });

  useEffect(() => {
    fetchSermons();
  }, []);

  const fetchSermons = async () => {
    try {
      const data = await sermonService.getSermons({ limit: 100 });
      setSermons(data.sermons || []);
      const pinned = (data.sermons || []).filter(s => s.pinned).length;
      setPinnedCount(pinned);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      pastor: '',
      date: '',
      category: 'Sunday Service',
      description: '',
      thumbnail: '',
      videoUrl: '',
      type: 'text'
    });
    setSermonType('text');
    setEditingId(null);
    setImagePreview(null);
  };

  const handleTypeChange = (type) => {
    setSermonType(type);
    setFormData({ ...formData, type });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (sermonType === 'photo' && !formData.thumbnail) {
      alert('Please upload or add a thumbnail URL for photo sermons');
      return;
    }
    if (sermonType === 'video' && !formData.videoUrl) {
      alert('Please add a YouTube video URL for video sermons');
      return;
    }

    try {
      setLoading(true);
      
      const dataToSubmit = {
        ...formData,
        type: sermonType
      };

      if (editingId) {
        await sermonService.updateSermon(editingId, dataToSubmit);
        alert('Sermon updated successfully!');
      } else {
        await sermonService.createSermon(dataToSubmit);
        alert('Sermon added successfully!');
      }

      setShowForm(false);
      resetForm();
      fetchSermons();
    } catch (error) {
      alert('Error saving sermon: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sermon) => {
    setFormData(sermon);
    setSermonType(sermon.type || 'text');
    setEditingId(sermon._id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this sermon?')) {
      try {
        await sermonService.deleteSermon(id);
        alert('Sermon deleted!');
        fetchSermons();
      } catch (error) {
        alert('Error deleting sermon');
      }
    }
  };

  const handlePin = async (id) => {
    if (pinnedCount >= 3 && !sermons.find(s => s._id === id)?.pinned) {
      alert('You can only pin up to 3 sermons');
      return;
    }

    try {
      const sermon = sermons.find(s => s._id === id);
      await sermonService.updateSermon(id, { pinned: !sermon.pinned });
      alert(sermon.pinned ? 'Sermon unpinned' : 'Sermon pinned!');
      fetchSermons();
    } catch (error) {
      alert('Error pinning sermon');
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData({ ...formData, thumbnail: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'text': return '📝';
      case 'photo': return '📸';
      case 'video': return '🎥';
      default: return '📺';
    }
  };

  const pinnedSermons = sermons.filter(s => s.pinned);
  const unpinnedSermons = sermons.filter(s => !s.pinned);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900">Manage Sermons</h1>
        <Button 
          variant="primary" 
          icon={Plus} 
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
        >
          Add New Sermon
        </Button>
      </div>

      {/* Pin Info Alert */}
      <Card className="mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Pin className="text-blue-600 flex-shrink-0 mt-1" size={20} />
          <div>
            <h3 className="font-semibold text-blue-900">Pinned Sermons</h3>
            <p className="text-sm text-blue-700">
              You have pinned <strong>{pinnedCount}/3</strong> sermons. Pinned sermons appear on the homepage.
            </p>
          </div>
        </div>
      </Card>

      {showForm && (
        <Card className="mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {editingId ? 'Edit Sermon' : 'Add New Sermon'}
          </h2>

          {/* Sermon Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-4">
              Sermon Type *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'text', label: 'Text Only', icon: '📝', desc: 'Just title and description' },
                { id: 'photo', label: 'Photo + Text', icon: '📸', desc: 'With thumbnail image' },
                { id: 'video', label: 'Video + Text', icon: '🎥', desc: 'YouTube video' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => handleTypeChange(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    sermonType === type.id
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="text-3xl mb-2">{type.icon}</div>
                  <div className="font-semibold text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-600 mt-1">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              name="title"
              label="Sermon Title *"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />

            <Input
              name="pastor"
              label="Pastor Name *"
              value={formData.pastor}
              onChange={(e) => setFormData({...formData, pastor: e.target.value})}
              required
            />

            <Input
              name="date"
              type="date"
              label="Date *"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />

            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option>Sunday Service</option>
              <option>Bible Study</option>
              <option>Special Event</option>
              <option>Youth Ministry</option>
              <option>Prayer Meeting</option>
            </select>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                rows="6"
                placeholder="Sermon description or key points..."
              />
            </div>

            {(sermonType === 'photo' || sermonType === 'video') && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {sermonType === 'photo' ? 'Thumbnail Image *' : 'Thumbnail Image *'}
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Upload Image (JPG, PNG)
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={handleImageUpload}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Or paste Image URL
                    </label>
                    <Input
                      name="thumbnail"
                      value={formData.thumbnail}
                      onChange={(e) => {
                        setFormData({...formData, thumbnail: e.target.value});
                        setImagePreview(e.target.value);
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>
              </div>
            )}

            {sermonType === 'video' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  YouTube Video URL *
                </label>
                <Input
                  name="videoUrl"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({...formData, videoUrl: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=..."
                  required={sermonType === 'video'}
                />
                <p className="text-xs text-gray-600 mt-1">
                  Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                </p>
              </div>
            )}

            {imagePreview && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preview</label>
                <img 
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/500x300?text=Invalid+URL';
                  }}
                />
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Saving...' : editingId ? 'Update Sermon' : 'Add Sermon'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Pinned Sermons Section */}
      {pinnedSermons.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center gap-2">
            <Pin size={24} className="text-blue-600" />
            Pinned Sermons ({pinnedSermons.length}/3)
          </h2>
          <div className="space-y-4">
            {pinnedSermons.map((sermon) => (
              <Card key={sermon._id} hover>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTypeIcon(sermon.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-blue-900">{sermon.title}</h3>
                          <Pin size={16} className="text-blue-600" />
                        </div>
                        <p className="text-gray-600">{sermon.pastor}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center mt-2">
                      <span className="text-xs bg-blue-100 text-blue-900 px-3 py-1 rounded-full font-semibold">
                        {sermon.category}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                        {new Date(sermon.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handlePin(sermon._id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Unpin"
                    >
                      <Pin size={20} fill="currentColor" />
                    </button>
                    <button 
                      onClick={() => handleEdit(sermon)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sermon._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Unpinned Sermons Section */}
      {unpinnedSermons.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-blue-900 mb-4">All Sermons</h2>
          <div className="space-y-4">
            {unpinnedSermons.map((sermon) => (
              <Card key={sermon._id} hover>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getTypeIcon(sermon.type)}</span>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-blue-900">{sermon.title}</h3>
                        <p className="text-gray-600">{sermon.pastor}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center mt-2">
                      <span className="text-xs bg-blue-100 text-blue-900 px-3 py-1 rounded-full font-semibold">
                        {sermon.category}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-800 px-3 py-1 rounded-full">
                        {new Date(sermon.date).toLocaleDateString()}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-900 px-3 py-1 rounded-full font-semibold">
                        {sermon.type || 'text'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button 
                      onClick={() => handlePin(sermon._id)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Pin to homepage"
                    >
                      <Pin size={20} />
                    </button>
                    <button 
                      onClick={() => handleEdit(sermon)}
                      className="p-2 text-blue-900 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit size={20} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sermon._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageSermons;