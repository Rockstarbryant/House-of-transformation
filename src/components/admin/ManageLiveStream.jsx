import React, { useState, useEffect } from 'react';
import { Play, Save } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import Input from '../common/Input';

const ManageLiveStream = () => {
  const [streamUrl, setStreamUrl] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('liveStreamUrl');
    const liveStatus = localStorage.getItem('isLive');
    if (saved) setStreamUrl(saved);
    if (liveStatus) setIsLive(liveStatus === 'true');
  }, []);

  const handleSave = () => {
    localStorage.setItem('liveStreamUrl', streamUrl);
    localStorage.setItem('isLive', isLive.toString());
    alert('Live stream settings saved!');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-blue-900 mb-8">Manage Live Stream</h1>

      <Card>
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={isLive}
                onChange={(e) => setIsLive(e.target.checked)}
                className="w-5 h-5"
              />
              <span className="font-bold">Stream is currently LIVE</span>
            </label>
          </div>

          <Input
            name="streamUrl"
            label="YouTube Live Stream URL"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="https://www.youtube.com/embed/YOUR_VIDEO_ID"
          />

          <Button variant="primary" icon={Save} onClick={handleSave}>
            Save Settings
          </Button>

          {streamUrl && (
            <div>
              <p className="font-bold mb-2">Preview:</p>
              <iframe
                src={streamUrl}
                className="w-full aspect-video rounded-lg"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Instructions</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Go to YouTube Studio</li>
          <li>Click "Create" → "Go Live"</li>
          <li>Set up your stream</li>
          <li>Copy the embed URL (format: https://www.youtube.com/embed/VIDEO_ID)</li>
          <li>Paste it above</li>
          <li>Check "Stream is currently LIVE"</li>
          <li>Click Save</li>
        </ol>
      </Card>
    </div>
  );
};

export default ManageLiveStream;