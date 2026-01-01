import React, { useState, useEffect } from 'react';
import { Settings, X, Search } from 'lucide-react';
import SermonCardText from '../components/sermons/SermonCardText';
import SermonCard from '../components/sermons/SermonCard';
import Loader from '../components/common/Loader';
import { sermonService } from '../services/api/sermonService';
import { Plus } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import Button from '../components/common/Button';
import PermissionAlert from '../components/common/PermissionAlert';

const SermonsPage = () => {
  const [allSermons, setAllSermons] = useState([]);
  const [filteredSermons, setFilteredSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  const categories = ['All', 'Sunday Service', 'Bible Study', 'Special Event', 'Youth Ministry'];

  useEffect(() => {
    fetchSermons();
  }, []);

  useEffect(() => {
    filterSermons();
  }, [selectedType, selectedCategory, searchTerm, allSermons]);

  const fetchSermons = async () => {
    try {
      setLoading(true);
      const data = await sermonService.getSermons({ limit: 100 });
      const sermons = data.sermons || data;
      
      const sermonsWithType = sermons.map(s => ({
        ...s,
        type: s.type || detectSermonType(s)
      }));
      
      setAllSermons(sermonsWithType);
      setError(null);
    } catch (err) {
      console.error('Error fetching sermons:', err);
      setError('Failed to load sermons');
    } finally {
      setLoading(false);
    }
  };

  const detectSermonType = (sermon) => {
    if (sermon.videoUrl) return 'video';
    if (sermon.thumbnail) return 'photo';
    return 'text';
  };

  const filterSermons = () => {
    let result = allSermons;

    if (selectedType !== 'all') {
      result = result.filter(s => detectSermonType(s) === selectedType);
    }

    if (selectedCategory !== 'All') {
      result = result.filter(s => s.category === selectedCategory);
    }

    if (searchTerm) {
      result = result.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.pastor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSermons(result);
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedCategory('All');
    setSearchTerm('');
    setShowAdvancedFilter(false);
  };

  const { canPostSermon, user } = useAuthContext();

  const handleAddSermon = () => {
  alert('Sermon creation form coming soon');
  // TODO: Create sermon form modal
  };

  if (loading) return <Loader />;

  return (
    <div className="pt-16 pb-20 bg-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header with Settings Button */}
        <div className="px-4 py-6 border-b border-gray-200 flex justify-between items-start">
  <div>
    <h1 className="text-4xl font-bold text-gray-900">Sermons</h1>
    <p className="text-gray-600 text-sm mt-2">
      {filteredSermons.length} {filteredSermons.length === 1 ? 'sermon' : 'sermons'} found
    </p>
  </div>
  <div className="flex flex-col gap-3">
    {canPostSermon() && (
      <Button
        onClick={handleAddSermon}
        variant="primary"
        className="flex items-center gap-2"
      >
        <Plus size={20} /> Add Sermon
      </Button>
    )}
    <button
      onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        showAdvancedFilter
          ? 'bg-blue-100 text-blue-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
      title="Show/hide advanced filters"
    >
      {showAdvancedFilter ? <X size={20} /> : <Settings size={20} />}
      {showAdvancedFilter ? 'Close' : 'Filters'}
    </button>
  </div>
    </div>

    {!canPostSermon() && user && (
  <div className="px-4 py-4">
    <PermissionAlert
      title="Cannot Add Sermons"
      message="Only pastors and bishops can upload sermons."
      requiredRole="pastor"
      currentRole={user.role}
      actionType="sermon upload"
    />
  </div>
)}

        {/* Basic Search Filter - Always Visible */}
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 bg-gray-100 rounded-full px-4 py-2">
            <Search size={18} className="text-gray-500" />
            <input
              type="text"
              placeholder="Search sermons by title, pastor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter - Always Visible */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto pb-2 border-b border-gray-200 bg-white">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Advanced Type Filter - Only shown when toggled */}
        {showAdvancedFilter && (
          <div className="border-b border-gray-200 bg-gray-50">
            {/* Type Filter Tabs */}
            <div className="flex overflow-x-auto px-4">
              {[
                { id: 'all', label: 'All Sermons', icon: '📺' },
                { id: 'text', label: 'Text Only', icon: '📝' },
                { id: 'photo', label: 'Photo + Text', icon: '📸' },
                { id: 'video', label: 'Video + Text', icon: '🎥' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors hover:text-gray-900 ${
                    selectedType === type.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
            
            {/* Reset Type Filter Button */}
            {selectedType !== 'all' && (
              <div className="px-4 py-3 text-center border-t border-gray-200">
                <button
                  onClick={() => setSelectedType('all')}
                  className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  Reset type filter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg m-4 text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        {filteredSermons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600 text-lg font-semibold">No sermons found</p>
            <p className="text-gray-500 text-sm mt-2">
              {searchTerm || selectedCategory !== 'All' || selectedType !== 'all'
                ? 'Try adjusting your filters or search term'
                : 'Check back soon for new sermons'}
            </p>
          </div>
        ) : (
          <div>
            {/* Text Only Sermons */}
            {filteredSermons.some(s => detectSermonType(s) === 'text') && (
              <div className="border-b border-gray-200">
                {filteredSermons
                  .filter(s => detectSermonType(s) === 'text')
                  .map(sermon => (
                    <SermonCardText key={sermon._id} sermon={sermon} />
                  ))}
              </div>
            )}

            {/* Media Sermons (Photo + Video) */}
            {filteredSermons.some(s => detectSermonType(s) !== 'text') && (
              <div className="p-4 md:p-6 space-y-6">
                {filteredSermons
                  .filter(s => detectSermonType(s) !== 'text')
                  .map(sermon => (
                    <SermonCard
                      key={sermon._id}
                      sermon={sermon}
                      type={detectSermonType(sermon)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SermonsPage;