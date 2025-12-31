import React from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

const UserManager = () => {
  const stats = [
    { label: 'Total Members', value: 342 },
    { label: 'New This Month', value: '+23', color: 'text-green-600' },
    { label: 'Active Volunteers', value: 87 }
  ];

  return (
    <Card>
      <h3 className="text-xl font-bold text-blue-900 mb-4">User Management</h3>
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div key={index} className="px-4 py-3 rounded-lg bg-gray-50 flex justify-between items-center">
            <span>{stat.label}</span>
            <span className={`font-bold ${stat.color || 'text-blue-900'}`}>{stat.value}</span>
          </div>
        ))}
        <Button variant="primary" fullWidth>View All Members</Button>
      </div>
    </Card>
  );
};

export default UserManager;