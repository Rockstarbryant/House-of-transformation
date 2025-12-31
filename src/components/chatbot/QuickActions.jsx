import React from 'react';

const QuickActions = ({ onSelect }) => {
  const actions = [
    'Service times?',
    'Volunteer',
    'Location'
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map(action => (
        <button
          key={action}
          onClick={() => onSelect(action)}
          className="text-xs bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200"
        >
          {action}
        </button>
      ))}
    </div>
  );
};

export default QuickActions;