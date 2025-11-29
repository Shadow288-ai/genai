import React, { useState, useRef, useEffect } from "react";
import type { User, Message, Conversation, Property } from "../../types";

interface ChatInterfaceProps {
  conversation: Conversation;
  messages: Message[];
  property: Property;
  currentUser: User;
  onSendMessage: (content: string) => void;
  onAskAI: (question: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  property,
  currentUser,
  onSendMessage,
  onAskAI,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showAIPanel, setShowAIPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  const handleAskAI = (question: string) => {
    onAskAI(question);
    setShowAIPanel(false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getSenderName = (message: Message) => {
    if (message.senderType === "AI") return "AI Assistant";
    if (message.senderType === "LANDLORD") return "Landlord";
    return currentUser.name;
  };

  const isCurrentUser = (message: Message) => {
    return message.senderId === currentUser.id;
  };

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div>
          <h3>{property.name}</h3>
          <p className="text-muted">{property.address}</p>
        </div>
        <button
          className="btn-secondary btn-sm"
          onClick={() => setShowAIPanel(!showAIPanel)}
        >
          {showAIPanel ? "Hide" : "Ask"} AI Assistant
        </button>
      </div>

      {showAIPanel && (
        <div className="ai-panel">
          <h4>Property Assistant</h4>
          <p className="text-muted">Ask me anything about this property</p>
          <div className="ai-quick-questions">
            <button
              className="btn-link"
              onClick={() => handleAskAI("How does the TV work?")}
            >
              How does the TV work?
            </button>
            <button
              className="btn-link"
              onClick={() => handleAskAI("Where are the spare keys?")}
            >
              Where are the spare keys?
            </button>
            <button
              className="btn-link"
              onClick={() => handleAskAI("How to reset the Wi-Fi router?")}
            >
              How to reset the Wi-Fi router?
            </button>
            <button
              className="btn-link"
              onClick={() => handleAskAI("Where are the forks?")}
            >
              Where are the forks?
            </button>
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.senderType.toLowerCase()} ${isCurrentUser(message) ? "own" : ""}`}
          >
            <div className="message-avatar">
              {message.senderType === "AI" ? "🤖" : message.senderType === "LANDLORD" ? "👤" : "👤"}
            </div>
            <div className="message-content">
              <div className="message-header">
                <strong>{getSenderName(message)}</strong>
                <span className="message-time">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-body">{message.content}</div>
              {message.metadata?.incidentId && (
                <div className="message-meta">
                  <span className="badge">Maintenance ticket created</span>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="btn-primary btn-send">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatInterface;

