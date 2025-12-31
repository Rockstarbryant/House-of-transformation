import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

const KidsActivities = ({ activities }) => {
  return (
    <Card>
      <div className="text-5xl mb-4 text-center">🎨</div>
      <h3 className="text-2xl font-bold text-blue-900 mb-4 text-center">Fun Activities</h3>
      <div className="space-y-3">
        {activities.map(activity => (
          <div key={activity.id} className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-xl hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activity.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900">{activity.title}</h4>
                <span className="text-xs bg-green-400 text-white px-2 py-1 rounded-full">
                  {activity.type}
                </span>
              </div>
              <Button variant="primary" size="sm">Start</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default KidsActivities;