import React, { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import './Chat.css';

interface ChatProps {
  doc: Y.Doc;
  username: string;
  isOpen: boolean;
  onToggle: () => void;
}

interface ChatMessage {
  text: string;
  sender: string;
  timestamp: string;
}

export const Chat: React.FC<ChatProps> = ({ doc, username, isOpen, onToggle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messagesArray = doc.getArray<ChatMessage>('chat-messages');

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fileData = e.dataTransfer.getData('application/colab-file');
    if (fileData) {
      const file = JSON.parse(fileData);
      setInputText(prev => prev + (prev ? ' ' : '') + `[${file.type === 'folder' ? '📁' : '📄'} ${file.name}]`);
    }
  };

  const handleMessageDragStart = (e: React.DragEvent, msg: ChatMessage) => {
    e.dataTransfer.setData('text/plain', `${msg.sender}: ${msg.text}`);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  useEffect(() => {
    const handleUpdate = () => {
      setMessages(messagesArray.toArray());
    };

    messagesArray.observe(handleUpdate);
    handleUpdate(); // Cargar iniciales

    return () => {
      messagesArray.unobserve(handleUpdate);
    };
  }, [doc]);

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: ChatMessage = {
      text: inputText.trim(),
      sender: username,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    messagesArray.push([newMessage]);
    setInputText('');
  };

  return (
    <div className={`panel chat-panel ${isOpen ? '' : 'collapsed'}`}>
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button 
          onClick={onToggle}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '14px', 
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '2px'
          }}
          title="Ocultar Chat"
        >
          ▶
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <h2 className="panel-title" style={{ fontSize: '15px' }}>Chat de Equipo</h2>
        </div>
      </div>

      <div className="panel-body messages-container">
        <div className="messages-list">
          {messages.length === 0 ? (
            <div className="no-messages">No hay mensajes. ¡Di hola! 👋</div>
          ) : (
            messages.map((msg, index) => {
              const isSelf = msg.sender === username;
              return (
                <div 
                  key={index} 
                  className={`message-bubble ${isSelf ? 'self' : 'other'}`}
                  draggable
                  onDragStart={(e) => handleMessageDragStart(e, msg)}
                  style={{ cursor: 'grab' }}
                  title="Arrastra este mensaje a la pizarra para crear una nota"
                >
                  <div className="message-header">
                    <span className="sender">{msg.sender}</span>
                    <span className="time">{msg.timestamp}</span>
                  </div>
                  <div className="message-content">{msg.text}</div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form 
        onSubmit={handleSendMessage} 
        className="chat-footer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="text"
          className="auth-input"
          placeholder="Escribe un mensaje..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        <button type="submit" className="send-btn">
          🚀
        </button>
      </form>
    </div>
  );
};
