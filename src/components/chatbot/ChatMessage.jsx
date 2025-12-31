import React from 'react';

const ChatMessage = ({ message }) => {
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] p-3 rounded-lg ${
        isUser 
          ? 'bg-blue-900 text-white rounded-br-none' 
          : 'bg-white shadow rounded-bl-none'
      }`}>
        {message.text}
      </div>
    </div>
  );
};

export default ChatMessage;