import React, { useState, useEffect } from 'react';
import { Play, Archive, Plus, Grid3x3, List, Calendar, Users, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useLivestream, useLivestreamAdmin } from '../../hooks/useLivestream';

const ManageLiveStream = () => {
  const { activeStream: publicActiveStream, archives: publicArchives, fetchArchives: publicFetchArchives } = useLivestream();
  const { 
    loading, 
    error, 
    success, 
    createStream, 
    archiveStream, 
    deleteStream 
  } = useLivestreamAdmin();

  const [view, setView] = useState('manage');
  const [gridView, setGridView] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'sermon',
    youtubeUrl: '',
    facebookUrl: '',
    startTime: '',
    status: 'scheduled',
    preachers: [],
    preacherNames: [],
    scriptures: [],
    description: ''
  });

  const streamTypes = [
    { value: 'sermon', label: '🎤 Sermon' },
    { value: 'praise_worship', label: '🎵 Praise & Worship' },
    { value: 'full_service', label: '⛪ Full Service' },
    { value: 'sunday_school', label: '📚 Sunday School' },
    { value: 'special_event', label: '🎉 Special Event' }
  ];

  // Fetch archives when filter changes
  useEffect(() => {
    publicFetchArchives({ 
      type: filterType, 
      limit: 50,
      includeScheduled: true
    });
  }, [filterType, publicFetchArchives]);

  const handleCreateStream = async (e) => {
    e.preventDefault();
    const result = await createStream(formData);
    if (result.success) {
      resetForm();
      setView('manage');
      publicFetchArchives({ type: filterType });
    }
  };

  const handleEndStream = async () => {
    if (!publicActiveStream) return;
    const result = await archiveStream(publicActiveStream._id, {
      archiveUrl: publicActiveStream.youtubeUrl || publicActiveStream.facebookUrl
    });
    if (result.success) {
      publicFetchArchives({ type: filterType });
    }
  };

  const handleDeleteStream = async (id) => {
    const confirmed = window.confirm('Delete this stream? This action cannot be undone.');
    if (!confirmed) return;
    const result = await deleteStream(id);
    if (result.success) {
      publicFetchArchives({ type: filterType });
    }
  };

  const handleEditStream = (stream) => {
    setFormData({
      title: stream.title,
      type: stream.type,
      youtubeUrl: stream.youtubeUrl || '',
      facebookUrl: stream.facebookUrl || '',
      startTime: new Date(stream.startTime).toISOString().slice(0, 16),
      status: stream.status,
      preachers: stream.preachers,
      preacherNames: stream.preacherNames,
      scriptures: stream.scriptures,
      description: stream.description || ''
    });
    setEditingId(stream._id);
    setView('create');
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'sermon',
      youtubeUrl: '',
      facebookUrl: '',
      startTime: '',
      status: 'scheduled',
      preachers: [],
      preacherNames: [],
      scriptures: [],
      description: ''
    });
    setEditingId(null);
  };

  const filteredArchives = searchTerm
    ? publicArchives.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()))
    : publicArchives;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-blue-900 mb-8">Manage Livestreams</h1>

      {/* SUCCESS/ERROR ALERTS */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="text-green-600" size={20} />
          <p className="text-green-800">{success}</p>
        </div>
      )}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* ACTIVE STREAM SECTION */}
      {publicActiveStream && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <h2 className="text-2xl font-bold text-red-700">LIVE NOW</h2>
            </div>
            <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold">Active</span>
          </div>
          <h3 className="text-xl font-bold mb-2">{publicActiveStream.title}</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Type</p>
              <p className="font-semibold capitalize">{publicActiveStream.type.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Started</p>
              <p className="font-semibold">{new Date(publicActiveStream.startTime).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleEditStream(publicActiveStream)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              Edit
            </button>
            <button onClick={handleEndStream} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Processing...' : 'End & Archive'}
            </button>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-4 mb-8 border-b">
        <button onClick={() => setView('manage')} className={`pb-3 px-4 font-semibold border-b-2 ${view === 'manage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}>
          Dashboard
        </button>
        <button onClick={() => { setView('create'); resetForm(); }} className={`pb-3 px-4 font-semibold border-b-2 flex items-center gap-2 ${view === 'create' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}>
          <Plus size={18} /> New Stream
        </button>
        <button onClick={() => setView('archive')} className={`pb-3 px-4 font-semibold border-b-2 flex items-center gap-2 ${view === 'archive' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}>
          <Archive size={18} /> Archives ({publicArchives.length})
        </button>
      </div>

      {/* CREATE/EDIT FORM */}
      {view === 'create' && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">{editingId ? 'Edit Stream' : 'Create New Stream'}</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Stream Title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
            <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full border rounded px-3 py-2">
              {streamTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full border rounded px-3 py-2">
              <option value="scheduled">📅 Scheduled</option>
              <option value="live">🔴 Live Now</option>
              <option value="archived">📦 Archived</option>
            </select>
            <textarea
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows="3"
            />
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
            <input
              type="url"
              placeholder="YouTube URL (embed or watch)"
              value={formData.youtubeUrl}
              onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="url"
              placeholder="Facebook URL (optional)"
              value={formData.facebookUrl}
              onChange={(e) => setFormData({...formData, facebookUrl: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Preacher Names (comma-separated)"
              value={formData.preacherNames.join(', ')}
              onChange={(e) => setFormData({...formData, preacherNames: e.target.value.split(',').map(p => p.trim())})}
              className="w-full border rounded px-3 py-2"
            />
            <input
              type="text"
              placeholder="Scripture References (comma-separated)"
              value={formData.scriptures.join(', ')}
              onChange={(e) => setFormData({...formData, scriptures: e.target.value.split(',').map(s => s.trim())})}
              className="w-full border rounded px-3 py-2"
            />
            <button onClick={handleCreateStream} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
              {loading ? 'Processing...' : editingId ? 'Update Stream' : 'Create Stream'}
            </button>
          </div>
        </div>
      )}

      {/* ARCHIVES VIEW */}
      {view === 'archive' && (
        <div>
          <div className="flex gap-4 mb-6">
            <input
              type="text"
              placeholder="Search archives..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border rounded px-3 py-2">
              <option value="">All Types</option>
              {streamTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button onClick={() => setGridView(!gridView)} className="border rounded px-3 py-2">
              {gridView ? <List size={20} /> : <Grid3x3 size={20} />}
            </button>
          </div>

          {loading ? (
            <p className="text-center text-gray-600">Loading...</p>
          ) : (
            <div className={gridView ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
              {filteredArchives.map(stream => (
                <div key={stream._id} className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
                  <span className="inline-block bg-gray-200 text-gray-800 px-2 py-1 text-xs rounded mb-2 capitalize">
                    {stream.type.replace('_', ' ')}
                  </span>
                  <h3 className="font-bold text-lg mb-2">{stream.title}</h3>
                  <div className="space-y-1 text-sm text-gray-600 mb-4">
                    <p className="flex items-center gap-2"><Calendar size={14} /> {new Date(stream.startTime).toLocaleDateString()}</p>
                    {stream.preacherNames?.length > 0 && <p className="flex items-center gap-2"><Users size={14} /> {stream.preacherNames.join(', ')}</p>}
                    {stream.scriptures?.length > 0 && <p className="flex items-center gap-2"><BookOpen size={14} /> {stream.scriptures.slice(0, 2).join(', ')}</p>}
                    <p className="flex items-center gap-2"><Play size={14} /> {stream.viewCount || 0} views</p>
                  </div>
                  {stream.aiSummary && (
                    <div className="bg-blue-50 p-2 rounded text-xs mb-3">
                      <p className="font-semibold text-blue-900 mb-1">AI Summary</p>
                      <p className="text-blue-800">{stream.aiSummary.summary.slice(0, 100)}...</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleEditStream(stream)} className="flex-1 bg-blue-100 text-blue-700 py-1 rounded text-sm hover:bg-blue-200 disabled:opacity-50" disabled={loading}>
                      Edit
                    </button>
                    <button onClick={() => handleDeleteStream(stream._id)} className="flex-1 bg-red-100 text-red-700 py-1 rounded text-sm hover:bg-red-200 disabled:opacity-50" disabled={loading}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DASHBOARD */}
      {view === 'manage' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
          <p className="text-gray-600 mb-4">Total Streams: {publicArchives.length} (Scheduled, Live, & Archived)</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicArchives.length > 0 ? (
              publicArchives.slice(0, 6).map(stream => (
                <div key={stream._id} className="border rounded p-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setView('archive'); setFilterType(stream.type); }}>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-sm">{stream.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${
                      stream.status === 'live' ? 'bg-red-100 text-red-700' :
                      stream.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {stream.status === 'live' ? '🔴 Live' : stream.status === 'scheduled' ? '📅 Scheduled' : '📦 Archived'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{new Date(stream.startTime).toLocaleDateString()}</p>
                  <p className="text-xs text-blue-600">Filter by {stream.type}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm col-span-3">No streams yet. Create one to get started!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageLiveStream;