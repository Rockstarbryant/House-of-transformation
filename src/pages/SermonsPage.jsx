import React, { useState, useEffect, useRef } from 'react';
import { Settings, X, Search, ChevronDown } from 'lucide-react';
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
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const lastScrollY = useRef(0);

  const categories = ['All', 'Sunday Service', 'Bible Study', 'Special Event', 'Youth Ministry', 'Prayer Meeting'];

  useEffect(() => {
    fetchSermons();
  }, []);

  useEffect(() => {
    filterSermons();
  }, [selectedType, selectedCategory, searchTerm, allSermons]);

  // Handle scroll to collapse/expand header
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Collapse header when scrolling down, expand when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsHeaderCollapsed(true);
      } else if (currentScrollY < lastScrollY.current) {
        setIsHeaderCollapsed(false);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchSermons = async () => {
    try {
      setLoading(true);
      const data = await sermonService.getSermons({ limit: 100 });
      const sermons = data.sermons || data;
      
      const sermonsWithDefaults = sermons.map(s => ({
        ...s,
        type: s.type || detectSermonType(s),
        descriptionHtml: s.descriptionHtml || s.description || '',
        description: s.description || ''
      }));
      
      console.log('📚 Fetched sermons:', sermonsWithDefaults.length);
      setAllSermons(sermonsWithDefaults);
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
    let result = [...allSermons];

    // ✅ FIX: Sort by date FIRST (most recent first)
    result = result.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Then apply filters
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
        (s.descriptionHtml || s.description)?.toLowerCase().includes(searchTerm.toLowerCase())
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
    window.location.href = '/admin/sermons';
  };

  if (loading) return <Loader />;

  return (
    <div className="pt-20 pb-20 bg-amber-200 min-h-screen">
      {/* ✅ DYNAMIC COLLAPSIBLE HEADER */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-300 ${
          isHeaderCollapsed ? 'opacity-0 -translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Header Title & Controls */}
        <div className="px-4 py-4 max-w-3xl mx-auto flex justify-between items-center">
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

        {/* Search Bar */}
        <div className="px-4 pb-4 border-t border-slate-200 max-w-3xl mx-auto">
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
        <div className="px-4 pb-4 border-t border-slate-200 max-w-3xl mx-auto">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                    : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Type Filter */}
        {showAdvancedFilter && (
          <div className="border-t border-slate-200 bg-slate-50 max-w-3xl mx-auto">
            <div className="flex overflow-x-auto px-4 scrollbar-hide">
              {[
                { id: 'all', label: 'All', icon: '📚' },
                { id: 'text', label: 'Text', icon: '📝' },
                { id: 'photo', label: 'Photo', icon: '📸' },
                { id: 'video', label: 'Video', icon: '🎥' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
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
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4">
        {!canPostSermon() && user && (
          <div className="py-4">
            <PermissionAlert
              title="Cannot Add Sermons"
              message="Only pastors and bishops can upload sermons."
              requiredRole="pastor"
              currentRole={user.role}
              actionType="sermon upload"
            />
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
            {/* ✅ FIX: Mix all sermon types together, sorted by date */}
            {filteredSermons.map(sermon => (
              <div key={sermon._id} className="py-4">
                {detectSermonType(sermon) === 'text' ? (
                  <SermonCardText sermon={sermon} />
                ) : (
                  <SermonCard sermon={sermon} type={detectSermonType(sermon)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scroll to top indicator */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default SermonsPage;