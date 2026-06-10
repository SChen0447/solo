import React from 'react';
import { ChatMessage } from '../types';

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  message: ChatMessage;
}

const ChatMessageItem = React.memo(function ChatMessageItem({ message }: Props) {
  return (
    <div className="chat-message">
      <span className="chat-user">{message.userName}</span>
      <div className="chat-content">{message.content}</div>
      <span className="chat-time">{formatTime(message.createdAt)}</span>
    </div>
  );
});

export default ChatMessageItem;
