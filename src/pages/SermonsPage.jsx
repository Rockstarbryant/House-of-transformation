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
  };

  if (loading) return <Loader />;

  return (
    <div className="pt-24 pb-20 bg-slate-900 min-h-screen">
      <div className="max-w-3xl mx-auto">
        {/* Sticky Header */}
        <div className="sticky top-20 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sermons</h1>
            <p className="text-slate-600 text-sm mt-1">
              {filteredSermons.length} {filteredSermons.length === 1 ? 'sermon' : 'sermons'} found
            </p>
          </div>
          <div className="flex gap-2">
            {canPostSermon() && (
              <Button
                onClick={handleAddSermon}
                variant="primary"
                size="md"
                icon={Plus}
              >
                Add
              </Button>
            )}
            <button
              onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
              className={`p-2 rounded-full transition-colors ${
                showAdvancedFilter
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title="Show/hide advanced filters"
            >
              {showAdvancedFilter ? <X size={20} /> : <Settings size={20} />}
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

        {/* Search Bar */}
        <div className="px-4 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 bg-slate-100 rounded-full px-4 py-3">
            <Search size={18} className="text-slate-500" />
            <input
              type="text"
              placeholder="Search sermons by title, pastor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-slate-900 placeholder:text-slate-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 py-3 flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 bg-white">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Advanced Type Filter */}
        {showAdvancedFilter && (
          <div className="border-b border-slate-200 bg-slate-50">
            <div className="flex overflow-x-auto px-4">
              {[
                { id: 'all', label: 'All', icon: '📚' },
                { id: 'text', label: 'Text', icon: '📝' },
                { id: 'photo', label: 'Photo', icon: '📸' },
                { id: 'video', label: 'Video', icon: '🎥' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors ${
                    selectedType === type.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 font-semibold">
            {error}
          </div>
        )}

        {/* Empty State */}
        {filteredSermons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-slate-900 text-lg font-bold">No sermons found</p>
            <p className="text-slate-600 text-sm mt-2">
              {searchTerm || selectedCategory !== 'All' || selectedType !== 'all'
                ? 'Try adjusting your filters or search term'
                : 'Check back soon for new sermons'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 space-y-4">
            {/* Text Sermons */}
            {filteredSermons
              .filter(s => detectSermonType(s) === 'text')
              .map(sermon => (
                <SermonCardText key={sermon._id} sermon={sermon} />
              ))}

            {/* Media Sermons */}
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
    </div>
  );
};

export default SermonsPage;