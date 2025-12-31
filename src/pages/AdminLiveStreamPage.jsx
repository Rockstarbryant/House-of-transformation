import React, { useState } from 'react';

const AdminLiveStreamPage = () => {
  const [streamUrl, setStreamUrl] = useState('');

  const handleSave = () => {
    localStorage.setItem('liveStreamUrl', streamUrl);
    alert('Live stream URL saved!');
  };

  return (
    <div className="pt-20 pb-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-blue-900 mb-8">Manage Live Stream</h1>
        
        <div className="bg-white p-8 rounded-xl shadow-lg">
          <label className="block mb-2 font-bold">YouTube Live URL:</label>
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full p-3 border rounded mb-4"
          />
          <button onClick={handleSave} className="bg-blue-900 text-white px-6 py-3 rounded-lg">
            Save Stream URL
          </button>
        </div>

        <div className="mt-8 bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to YouTube Studio</li>
            <li>Click "Create" → "Go Live"</li>
            <li>Copy your stream URL</li>
            <li>Paste it here</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveStreamPage;