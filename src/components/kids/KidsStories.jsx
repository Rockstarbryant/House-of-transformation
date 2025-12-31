import React from 'react';
import Card from '../common/Card';

const KidsStories = ({ stories }) => {
  return (
    <Card>
      <div className="text-5xl mb-4 text-center">📖</div>
      <h3 className="text-2xl font-bold text-blue-900 mb-4 text-center">Bible Stories</h3>
      <div className="space-y-3">
        {stories.map(story => (
          <div key={story.id} className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{story.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900">{story.title}</h4>
                <p className="text-sm text-gray-600">{story.description}</p>
                <span className="text-xs bg-yellow-400 text-blue-900 px-2 py-1 rounded-full mt-2 inline-block">
                  Ages {story.ageGroup}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default KidsStories;